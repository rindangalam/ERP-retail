// Appwrite Function: postGoodsReceipt
// Mem-posting goods receipt → stock_movements + journal_entries + update PO status.
import { Client, Databases, ID, Permission, Query, Role } from "node-appwrite";
import { validatePostGRInput, buildJournalPlan, determinePOStatus } from "./core.js";

const DATABASE_ID = process.env.ERP_DATABASE_ID || "erp";
const PRODUCTS_COLLECTION = process.env.ERP_PRODUCTS_COLLECTION || "products";
const MOVEMENTS_COLLECTION = process.env.ERP_STOCK_MOVEMENTS_COLLECTION || "stock_movements";
const GR_COLLECTION = process.env.ERP_GOODS_RECEIPTS_COLLECTION || "goods_receipts";
const GR_ITEMS_COLLECTION = process.env.ERP_GOODS_RECEIPT_ITEMS_COLLECTION || "goods_receipt_items";
const PO_COLLECTION = process.env.ERP_PURCHASE_ORDERS_COLLECTION || "purchase_orders";
const PO_ITEMS_COLLECTION = process.env.ERP_PURCHASE_ORDER_ITEMS_COLLECTION || "purchase_order_items";
const COA_COLLECTION = process.env.ERP_CHART_OF_ACCOUNTS_COLLECTION || "chart_of_accounts";
const JE_COLLECTION = process.env.ERP_JOURNAL_ENTRIES_COLLECTION || "journal_entries";
const JEL_COLLECTION = process.env.ERP_JOURNAL_ENTRY_LINES_COLLECTION || "journal_entry_lines";

const MOVEMENT_READ_LABELS = ["admin", "warehouse", "finance"];

async function listByField(databases, collectionId, field, value) {
  const all = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const page = await databases.listDocuments(DATABASE_ID, collectionId, [
      Query.equal(field, [value]),
      Query.limit(limit),
      Query.offset(offset),
    ]);
    all.push(...page.documents);
    if (page.documents.length < limit) break;
    offset += limit;
  }
  return all;
}

function currentStockOf(movements) {
  return movements.reduce((sum, m) => sum + Number(m.quantity_delta), 0);
}

export default async ({ req, res, error }) => {
  const env = (req && req.env) || process.env || {};

  const client = new Client()
    .setEndpoint(env["APPWRITE_FUNCTION_ENDPOINT"] || "https://sgp.cloud.appwrite.io/v1")
    .setProject(env["APPWRITE_FUNCTION_PROJECT_ID"])
    .setKey(env["APPWRITE_FUNCTION_API_KEY"]);

  const databases = new Databases(client);

  let payload;
  try {
    payload = JSON.parse(req.body || "{}");
  } catch {
    return res.json({ ok: false, errors: { _form: "Body harus JSON." } }, 400);
  }

  const { errors, goods_receipt_id, created_by } = validatePostGRInput(payload);
  if (Object.keys(errors).length > 0) {
    return res.json({ ok: false, errors }, 400);
  }

  try {
    // 1. Load GR
    const gr = await databases.getDocument(DATABASE_ID, GR_COLLECTION, goods_receipt_id);
    if (gr.status !== "draft") {
      return res.json(
        { ok: false, errors: { _form: `GR sudah ${gr.status === "posted" ? "diposting" : "dibatalkan"}.` } },
        409
      );
    }

    // 2. Load GR items
    const gr_items = await listByField(databases, GR_ITEMS_COLLECTION, "goods_receipt_id", goods_receipt_id);
    if (gr_items.length === 0) {
      return res.json({ ok: false, errors: { _form: "GR tidak memiliki item." } }, 400);
    }

    // 3. Load PO + PO items
    const po = await databases.getDocument(DATABASE_ID, PO_COLLECTION, gr.purchase_order_id);
    const po_items = await listByField(databases, PO_ITEMS_COLLECTION, "purchase_order_id", po.$id);
    const po_items_map = new Map(po_items.map((pi) => [pi.$id, pi]));

    // 4. Validate: qty_received <= PO item quantity for this GR
    for (const gi of gr_items) {
      const po_item = po_items_map.get(gi.purchase_order_item_id);
      if (!po_item) {
        return res.json(
          { ok: false, errors: { _form: `Item PO ${gi.purchase_order_item_id} tidak ditemukan.` } },
          400
        );
      }
      if (Number(gi.quantity_received) <= 0) {
        return res.json(
          { ok: false, errors: { _form: `Qty diterima harus lebih dari 0 untuk produk ${gi.product_id}.` } },
          400
        );
      }
      if (Number(gi.quantity_received) > Number(po_item.quantity)) {
        return res.json(
          {
            ok: false,
            errors: {
              _form: `Qty diterima (${gi.quantity_received}) melebihi qty PO (${po_item.quantity}).`,
            },
          },
          409
        );
      }
    }

    // 5. Validate: cumulative received across all GRs <= PO quantity
    const all_grs_for_po = await listByField(databases, GR_COLLECTION, "purchase_order_id", po.$id);
    const cumulative = new Map(); // po_item_id -> total_received
    for (const existing_gr of all_grs_for_po) {
      if (existing_gr.$id === goods_receipt_id) continue; // skip current (draft, not posted)
      if (existing_gr.status !== "posted") continue;
      const existing_items = await listByField(databases, GR_ITEMS_COLLECTION, "goods_receipt_id", existing_gr.$id);
      for (const ei of existing_items) {
        cumulative.set(
          ei.purchase_order_item_id,
          (cumulative.get(ei.purchase_order_item_id) ?? 0) + Number(ei.quantity_received)
        );
      }
    }
    // Add current GR items to cumulative
    for (const gi of gr_items) {
      cumulative.set(
        gi.purchase_order_item_id,
        (cumulative.get(gi.purchase_order_item_id) ?? 0) + Number(gi.quantity_received)
      );
    }
    // Validate
    for (const po_item of po_items) {
      const total = cumulative.get(po_item.$id) ?? 0;
      if (total > Number(po_item.quantity)) {
        return res.json(
          {
            ok: false,
            errors: {
              _form: `Total diterima (${total}) melebihi qty PO (${po_item.quantity}) untuk item ${po_item.product_id}.`,
            },
          },
          409
        );
      }
    }

    // 6. Journal plan
    const plan = buildJournalPlan({ gr_items, po_items_map });
    if (plan.error === "total_zero") {
      return res.json({ ok: false, errors: { _form: "Total nol. Periksa qty diterima." } }, 400);
    }

    // 7. Resolve account IDs from COA
    const coa_accounts = await databases.listDocuments(DATABASE_ID, COA_COLLECTION, [
      Query.equal("is_active", [true]),
    ]);
    const coa_map = new Map(coa_accounts.documents.map((a) => [a.code, a]));

    const inventory_acct = coa_map.get("1110");
    const ap_acct = coa_map.get("2110");
    if (!inventory_acct || !ap_acct) {
      return res.json(
        { ok: false, errors: { _form: "Akun Persediaan (1110) atau Hutang Usaha (2110) tidak ditemukan di COA." } },
        500
      );
    }
    plan.lines[0].account_id = inventory_acct.$id;
    plan.lines[1].account_id = ap_acct.$id;

    const now = new Date().toISOString();
    const movementCount = 0;
    const updatedProducts = [];

    // 8. Create stock_movements + update product stocks
    for (const gi of gr_items) {
      const qty = Number(gi.quantity_received);

      const existing = await databases.listDocuments(DATABASE_ID, MOVEMENTS_COLLECTION, [
        Query.equal("product_id", [gi.product_id]),
        Query.equal("movement_type", ["goods_receipt"]),
        Query.equal("source_type", ["goods_receipt"]),
        Query.equal("source_id", [goods_receipt_id]),
        Query.limit(1),
      ]);
      if (existing.documents.length > 0) continue;

      const movements = await listByField(databases, MOVEMENTS_COLLECTION, "product_id", gi.product_id);
      const currentStock = currentStockOf(movements);
      const newStock = currentStock + qty;

      await databases.createDocument(
        DATABASE_ID,
        MOVEMENTS_COLLECTION,
        ID.unique(),
        {
          product_id: gi.product_id,
          movement_type: "goods_receipt",
          quantity_delta: qty,
          source_type: "goods_receipt",
          source_id: goods_receipt_id,
          note: `GR ${gr.gr_number}`,
          created_by,
          created_at: now,
        },
        MOVEMENT_READ_LABELS.map((label) => Permission.read(Role.label(label)))
      );

      await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, gi.product_id, {
        current_stock: newStock,
        updated_at: now,
        updated_by: created_by,
      });

      updatedProducts.push({ product_id: gi.product_id, current_stock: newStock });
    }

    // 9. Create journal entry
    const all_entries = await databases.listDocuments(DATABASE_ID, JE_COLLECTION, [
      Query.orderDesc("entry_number"),
      Query.limit(1),
    ]);
    let nextJENumber = "JE-001";
    if (all_entries.documents.length > 0) {
      const last = all_entries.documents[0].entry_number;
      const match = last.match(/JE-(\d+)/);
      if (match) {
        nextJENumber = `JE-${String(parseInt(match[1], 10) + 1).padStart(3, "0")}`;
      }
    }

    const je_doc = await databases.createDocument(
      DATABASE_ID,
      JE_COLLECTION,
      ID.unique(),
      {
        entry_number: nextJENumber,
        entry_date: gr.received_date || now.slice(0, 10),
        source_type: "goods_receipt",
        source_id: goods_receipt_id,
        description: `GR ${gr.gr_number} — ${po.po_number}`,
        total_debit: plan.total_amount,
        total_credit: plan.total_amount,
        status: "posted",
        created_by: "system",
        created_at: now,
      },
      MOVEMENT_READ_LABELS.map((label) => Permission.read(Role.label(label)))
    );

    for (const line of plan.lines) {
      await databases.createDocument(
        DATABASE_ID,
        JEL_COLLECTION,
        ID.unique(),
        {
          journal_entry_id: je_doc.$id,
          account_id: line.account_id,
          debit: line.debit,
          credit: line.credit,
          description: line.description,
        },
        MOVEMENT_READ_LABELS.map((label) => Permission.read(Role.label(label)))
      );
    }

    // 10. Update PO status
    const newPOStatus = determinePOStatus(cumulative, po_items);
    await databases.updateDocument(DATABASE_ID, PO_COLLECTION, po.$id, {
      status: newPOStatus,
      updated_by: created_by,
      updated_at: now,
    });

    // 11. Mark GR as posted
    await databases.updateDocument(DATABASE_ID, GR_COLLECTION, goods_receipt_id, {
      status: "posted",
      posted_by: created_by,
      posted_at: now,
    });

    return res.json({
      ok: true,
      posted: true,
      movement_count: gr_items.length,
      journal_entry_id: je_doc.$id,
      new_po_status: newPOStatus,
      updated_products: updatedProducts,
    });
  } catch (e) {
    if (e.code === 404) {
      return res.json({ ok: false, errors: { _form: "GR atau PO tidak ditemukan." } }, 404);
    }
    error(String(e));
    return res.json({ ok: false, errors: { _form: "postGoodsReceipt gagal: " + e.message } }, 500);
  }
};
