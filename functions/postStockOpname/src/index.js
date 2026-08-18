// Appwrite Function: postTransaction (postStockOpname + postGoodsReceipt)
// Handles type=stock_opname (original) and type=goods_receipt (new).
import { Client, Databases, ID, Permission, Query, Role } from "node-appwrite";
import {
  validatePostOpnameInput,
  buildAdjustments,
  validatePostGRInput,
  buildJournalPlan,
  determinePOStatus,
  validatePostPRInput,
  buildPRJournalPlan,
  determinePOStatusAfterReturn,
} from "./core.js";

const DATABASE_ID = process.env.ERP_DATABASE_ID || "erp";
const PRODUCTS_COLLECTION = process.env.ERP_PRODUCTS_COLLECTION || "products";
const MOVEMENTS_COLLECTION = process.env.ERP_STOCK_MOVEMENTS_COLLECTION || "stock_movements";
const OPN_COLLECTION = process.env.ERP_STOCK_OPNAMES_COLLECTION || "stock_opnames";
const OPN_ITEMS_COLLECTION = process.env.ERP_STOCK_OPNAME_ITEMS_COLLECTION || "stock_opname_items";
const GR_COLLECTION = process.env.ERP_GOODS_RECEIPTS_COLLECTION || "goods_receipts";
const GR_ITEMS_COLLECTION = process.env.ERP_GOODS_RECEIPT_ITEMS_COLLECTION || "goods_receipt_items";
const PO_COLLECTION = process.env.ERP_PURCHASE_ORDERS_COLLECTION || "purchase_orders";
const PO_ITEMS_COLLECTION = process.env.ERP_PURCHASE_ORDER_ITEMS_COLLECTION || "purchase_order_items";
const COA_COLLECTION = process.env.ERP_CHART_OF_ACCOUNTS_COLLECTION || "chart_of_accounts";
const JE_COLLECTION = process.env.ERP_JOURNAL_ENTRIES_COLLECTION || "journal_entries";
const JEL_COLLECTION = process.env.ERP_JOURNAL_ENTRY_LINES_COLLECTION || "journal_entry_lines";
const PR_COLLECTION = process.env.ERP_PURCHASE_RETURNS_COLLECTION || "purchase_returns";
const PR_ITEMS_COLLECTION = process.env.ERP_PURCHASE_RETURN_ITEMS_COLLECTION || "purchase_return_items";
const SI_COLLECTION = process.env.ERP_SALES_INVOICES_COLLECTION || "sales_invoices";
const SI_ITEMS_COLLECTION = process.env.ERP_SALES_INVOICE_ITEMS_COLLECTION || "sales_invoice_items";
const SO_COLLECTION = process.env.ERP_SALES_ORDERS_COLLECTION || "sales_orders";
const SO_ITEMS_COLLECTION = process.env.ERP_SALES_ORDER_ITEMS_COLLECTION || "sales_order_items";
const SR_COLLECTION = process.env.ERP_SALES_RETURNS_COLLECTION || "sales_returns";
const SRI_COLLECTION = process.env.ERP_SALES_RETURN_ITEMS_COLLECTION || "sales_return_items";

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

async function handlePostOpname(databases, payload, res, error) {
  const { errors, stock_opname_id, created_by, allowNegative } = validatePostOpnameInput(payload);
  if (Object.keys(errors).length > 0) return res.json({ ok: false, errors }, 400);

  try {
    const opname = await databases.getDocument(DATABASE_ID, OPN_COLLECTION, stock_opname_id);
    if (opname.status !== "draft") {
      return res.json(
        { ok: false, errors: { _form: `Opname sudah ${opname.status === "posted" ? "di-posting" : "dibatalkan"}.` } },
        409
      );
    }

    const items = await listByField(databases, OPN_ITEMS_COLLECTION, "stock_opname_id", stock_opname_id);
    if (items.length === 0) {
      return res.json({ ok: false, errors: { _form: "Opname tidak memiliki item." } }, 400);
    }

    const { adjustments, errors: itemErrors } = buildAdjustments(items);
    if (Object.keys(itemErrors).length > 0) return res.json({ ok: false, errors: itemErrors }, 400);
    if (adjustments.length === 0) {
      return res.json({ ok: false, errors: { _form: "Tidak ada selisih yang perlu disesuaikan." } }, 400);
    }

    const now = new Date().toISOString();
    const updatedProducts = [];
    let movementCount = 0;

    for (const adj of adjustments) {
      const existing = await databases.listDocuments(DATABASE_ID, MOVEMENTS_COLLECTION, [
        Query.equal("product_id", [adj.product_id]),
        Query.equal("movement_type", ["stock_opname"]),
        Query.equal("source_type", ["stock_opname"]),
        Query.equal("source_id", [stock_opname_id]),
        Query.limit(1),
      ]);
      if (existing.documents.length > 0) {
        updatedProducts.push({ product_id: adj.product_id, duplicate: true });
        continue;
      }

      const currentStock = currentStockOf(
        await listByField(databases, MOVEMENTS_COLLECTION, "product_id", adj.product_id)
      );
      const newStock = currentStock + adj.difference;
      if (newStock < 0 && !allowNegative) {
        return res.json(
          { ok: false, errors: { _form: "Stok tidak cukup.", available: currentStock, product_id: adj.product_id } },
          409
        );
      }

      await databases.createDocument(
        DATABASE_ID, MOVEMENTS_COLLECTION, ID.unique(),
        {
          product_id: adj.product_id,
          movement_type: "stock_opname",
          quantity_delta: adj.difference,
          source_type: "stock_opname",
          source_id: stock_opname_id,
          note: `Opname ${opname.opname_number}`.slice(0, 500),
          created_by,
          created_at: now,
        },
        MOVEMENT_READ_LABELS.map((label) => Permission.read(Role.label(label)))
      );
      movementCount += 1;

      await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, adj.product_id, {
        current_stock: newStock,
        updated_at: now,
        updated_by: created_by,
      });
      updatedProducts.push({ product_id: adj.product_id, duplicate: false, difference: adj.difference, current_stock: newStock });
    }

    await databases.updateDocument(DATABASE_ID, OPN_COLLECTION, stock_opname_id, {
      status: "posted",
      posted_by: created_by,
      posted_at: now,
    });

    return res.json({ ok: true, posted: true, movement_count: movementCount, updated_products: updatedProducts });
  } catch (e) {
    if (e.code === 404) return res.json({ ok: false, errors: { _form: "Opname tidak ditemukan." } }, 404);
    error(String(e));
    return res.json({ ok: false, errors: { _form: "postStockOpname gagal: " + e.message } }, 500);
  }
}

async function handlePostGR(databases, payload, res, error) {
  const { errors, goods_receipt_id, created_by } = validatePostGRInput(payload);
  if (Object.keys(errors).length > 0) return res.json({ ok: false, errors }, 400);

  try {
    const gr = await databases.getDocument(DATABASE_ID, GR_COLLECTION, goods_receipt_id);
    if (gr.status !== "draft") {
      return res.json(
        { ok: false, errors: { _form: `GR sudah ${gr.status === "posted" ? "diposting" : "dibatalkan"}.` } },
        409
      );
    }

    const gr_items = await listByField(databases, GR_ITEMS_COLLECTION, "goods_receipt_id", goods_receipt_id);
    if (gr_items.length === 0) {
      return res.json({ ok: false, errors: { _form: "GR tidak memiliki item." } }, 400);
    }

    const po = await databases.getDocument(DATABASE_ID, PO_COLLECTION, gr.purchase_order_id);
    const po_items = await listByField(databases, PO_ITEMS_COLLECTION, "purchase_order_id", po.$id);
    const po_items_map = new Map(po_items.map((pi) => [pi.$id, pi]));

    // Validate qty_received <= PO qty
    for (const gi of gr_items) {
      const po_item = po_items_map.get(gi.purchase_order_item_id);
      if (!po_item) {
        return res.json({ ok: false, errors: { _form: `Item PO ${gi.purchase_order_item_id} tidak ditemukan.` } }, 400);
      }
      if (Number(gi.quantity_received) <= 0) {
        return res.json({ ok: false, errors: { _form: `Qty diterima harus > 0.` } }, 400);
      }
      if (Number(gi.quantity_received) > Number(po_item.quantity)) {
        return res.json(
          { ok: false, errors: { _form: `Qty diterima (${gi.quantity_received}) melebihi qty PO (${po_item.quantity}).` } },
          409
        );
      }
    }

    // Validate cumulative received
    const all_grs = await listByField(databases, GR_COLLECTION, "purchase_order_id", po.$id);
    const cumulative = new Map();
    for (const existing_gr of all_grs) {
      if (existing_gr.$id === goods_receipt_id || existing_gr.status !== "posted") continue;
      const ei = await listByField(databases, GR_ITEMS_COLLECTION, "goods_receipt_id", existing_gr.$id);
      for (const item of ei) {
        cumulative.set(item.purchase_order_item_id, (cumulative.get(item.purchase_order_item_id) ?? 0) + Number(item.quantity_received));
      }
    }
    for (const gi of gr_items) {
      cumulative.set(gi.purchase_order_item_id, (cumulative.get(gi.purchase_order_item_id) ?? 0) + Number(gi.quantity_received));
    }
    for (const pi of po_items) {
      const total = cumulative.get(pi.$id) ?? 0;
      if (total > Number(pi.quantity)) {
        return res.json(
          { ok: false, errors: { _form: `Total diterima (${total}) melebihi qty PO (${pi.quantity}) untuk item ${pi.product_id}.` } },
          409
        );
      }
    }

    // Journal plan
    const plan = buildJournalPlan({ gr_items, po_items_map });
    if (plan.error === "total_zero") {
      return res.json({ ok: false, errors: { _form: "Total nol." } }, 400);
    }

    const coa_accounts = await databases.listDocuments(DATABASE_ID, COA_COLLECTION, [Query.equal("is_active", [true])]);
    const coa_map = new Map(coa_accounts.documents.map((a) => [a.code, a]));
    const inv = coa_map.get("1110");
    const ap = coa_map.get("2110");
    if (!inv || !ap) {
      return res.json({ ok: false, errors: { _form: "Akun 1110/2110 tidak ditemukan di COA." } }, 500);
    }
    plan.lines[0].account_id = inv.$id;
    plan.lines[1].account_id = ap.$id;

    const now = new Date().toISOString();
    const updatedProducts = [];

    // Stock movements
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
      const newStock = currentStockOf(movements) + qty;

      await databases.createDocument(
        DATABASE_ID, MOVEMENTS_COLLECTION, ID.unique(),
        {
          product_id: gi.product_id,
          movement_type: "goods_receipt",
          quantity_delta: qty,
          source_type: "goods_receipt",
          source_id: goods_receipt_id,
          note: `GR ${gr.gr_number}`.slice(0, 500),
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

    // Journal entry
    const all_entries = await databases.listDocuments(DATABASE_ID, JE_COLLECTION, [Query.orderDesc("entry_number"), Query.limit(1)]);
    let nextJE = "JE-001";
    if (all_entries.documents.length > 0) {
      const m = all_entries.documents[0].entry_number.match(/JE-(\d+)/);
      if (m) nextJE = `JE-${String(parseInt(m[1], 10) + 1).padStart(3, "0")}`;
    }

    const je_doc = await databases.createDocument(
      DATABASE_ID, JE_COLLECTION, ID.unique(),
      {
        entry_number: nextJE,
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
        DATABASE_ID, JEL_COLLECTION, ID.unique(),
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

    // Update PO status
    const newPOStatus = determinePOStatus(cumulative, po_items);
    await databases.updateDocument(DATABASE_ID, PO_COLLECTION, po.$id, {
      status: newPOStatus, updated_by: created_by, updated_at: now,
    });

    // Mark GR posted
    await databases.updateDocument(DATABASE_ID, GR_COLLECTION, goods_receipt_id, {
      status: "posted", posted_by: created_by, posted_at: now,
    });

    return res.json({
      ok: true, posted: true, movement_count: gr_items.length,
      journal_entry_id: je_doc.$id, new_po_status: newPOStatus, updated_products: updatedProducts,
    });
  } catch (e) {
    if (e.code === 404) return res.json({ ok: false, errors: { _form: "GR atau PO tidak ditemukan." } }, 404);
    error(String(e));
    return res.json({ ok: false, errors: { _form: "postGoodsReceipt gagal: " + e.message } }, 500);
  }
}

async function handlePostPR(databases, payload, res, error) {
  const { errors, purchase_return_id, created_by } = validatePostPRInput(payload);
  if (Object.keys(errors).length > 0) return res.json({ ok: false, errors }, 400);

  try {
    const pr = await databases.getDocument(DATABASE_ID, PR_COLLECTION, purchase_return_id);
    if (pr.status !== "draft") {
      return res.json(
        { ok: false, errors: { _form: `PR sudah ${pr.status === "posted" ? "diposting" : "dibatalkan"}.` } },
        409
      );
    }

    const pr_items = await listByField(databases, PR_ITEMS_COLLECTION, "purchase_return_id", purchase_return_id);
    if (pr_items.length === 0) {
      return res.json({ ok: false, errors: { _form: "PR tidak memiliki item." } }, 400);
    }

    // Validate qty > 0
    for (const ri of pr_items) {
      if (Number(ri.quantity) <= 0) {
        return res.json({ ok: false, errors: { _form: "Qty retur harus > 0." } }, 400);
      }
    }

    // PO status recalculation
    let po = null, po_items = [];
    if (pr.purchase_order_id) {
      po = await databases.getDocument(DATABASE_ID, PO_COLLECTION, pr.purchase_order_id);
      po_items = await listByField(databases, PO_ITEMS_COLLECTION, "purchase_order_id", po.$id);

      const po_items_map = new Map(po_items.map((pi) => [pi.$id, pi]));

      // Cumulative received from all posted GRs (keyed by product_id)
      const all_grs = await listByField(databases, GR_COLLECTION, "purchase_order_id", po.$id);
      const cumulative_received = new Map();
      for (const gr of all_grs) {
        if (gr.status !== "posted") continue;
        const gi = await listByField(databases, GR_ITEMS_COLLECTION, "goods_receipt_id", gr.$id);
        for (const item of gi) {
          const pi = po_items_map.get(item.purchase_order_item_id);
          const pid = pi ? pi.product_id : item.purchase_order_item_id;
          cumulative_received.set(pid, (cumulative_received.get(pid) ?? 0) + Number(item.quantity_received));
        }
      }

      // Cumulative returned from all posted PRs (excluding current)
      const all_prs = await listByField(databases, PR_COLLECTION, "purchase_order_id", po.$id);
      const cumulative_returned = new Map();
      for (const existing_pr of all_prs) {
        if (existing_pr.$id === purchase_return_id || existing_pr.status !== "posted") continue;
        const ri = await listByField(databases, PR_ITEMS_COLLECTION, "purchase_return_id", existing_pr.$id);
        for (const item of ri) {
          cumulative_returned.set(item.product_id, (cumulative_returned.get(item.product_id) ?? 0) + Number(item.quantity));
        }
      }

      // Validate: returned qty for this product must not exceed net received
      for (const ri of pr_items) {
        const net = (cumulative_received.get(ri.product_id) ?? 0) - (cumulative_returned.get(ri.product_id) ?? 0);
        const returnQty = Number(ri.quantity);
        if (returnQty > net) {
          return res.json(
            { ok: false, errors: { _form: `Qty retur (${returnQty}) melebihi qty diterima bersih (${net}) untuk produk ${ri.product_id}.` } },
            409
          );
        }
      }

      // Add current PR items to cumulative_returned
      for (const ri of pr_items) {
        cumulative_returned.set(ri.product_id, (cumulative_returned.get(ri.product_id) ?? 0) + Number(ri.quantity));
      }

      // Journal plan
      const po_items_map_for_journal = new Map();
      for (const ri of pr_items) {
        for (const pi of po_items) {
          if (pi.product_id === ri.product_id) {
            po_items_map_for_journal.set(ri.product_id, pi);
            break;
          }
        }
      }
      const plan = buildPRJournalPlan({ pr_items, po_items_map: po_items_map_for_journal });
      if (plan.error === "total_zero") {
        return res.json({ ok: false, errors: { _form: "Total nol." } }, 400);
      }

      const coa_accounts = await databases.listDocuments(DATABASE_ID, COA_COLLECTION, [Query.equal("is_active", [true])]);
      const coa_map = new Map(coa_accounts.documents.map((a) => [a.code, a]));
      const inv = coa_map.get("1110");
      const ap = coa_map.get("2110");
      if (!inv || !ap) {
        return res.json({ ok: false, errors: { _form: "Akun 1110/2110 tidak ditemukan di COA." } }, 500);
      }
      plan.lines[0].account_id = ap.$id;
      plan.lines[1].account_id = inv.$id;

      const now = new Date().toISOString();
      const updatedProducts = [];

      // Stock movements (reverse = negative)
      for (const ri of pr_items) {
        const qty = -Number(ri.quantity);
        const existing = await databases.listDocuments(DATABASE_ID, MOVEMENTS_COLLECTION, [
          Query.equal("product_id", [ri.product_id]),
          Query.equal("movement_type", ["purchase_return"]),
          Query.equal("source_type", ["purchase_return"]),
          Query.equal("source_id", [purchase_return_id]),
          Query.limit(1),
        ]);
        if (existing.documents.length > 0) continue;

        const movements = await listByField(databases, MOVEMENTS_COLLECTION, "product_id", ri.product_id);
        const newStock = currentStockOf(movements) + qty;

        await databases.createDocument(
          DATABASE_ID, MOVEMENTS_COLLECTION, ID.unique(),
          {
            product_id: ri.product_id,
            movement_type: "purchase_return",
            quantity_delta: qty,
            source_type: "purchase_return",
            source_id: purchase_return_id,
            note: `PR ${pr.return_number}`.slice(0, 500),
            created_by,
            created_at: now,
          },
          MOVEMENT_READ_LABELS.map((label) => Permission.read(Role.label(label)))
        );

        await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, ri.product_id, {
          current_stock: newStock,
          updated_at: now,
          updated_by: created_by,
        });
        updatedProducts.push({ product_id: ri.product_id, current_stock: newStock });
      }

      // Journal entry
      const all_entries = await databases.listDocuments(DATABASE_ID, JE_COLLECTION, [Query.orderDesc("entry_number"), Query.limit(1)]);
      let nextJE = "JE-001";
      if (all_entries.documents.length > 0) {
        const m = all_entries.documents[0].entry_number.match(/JE-(\d+)/);
        if (m) nextJE = `JE-${String(parseInt(m[1], 10) + 1).padStart(3, "0")}`;
      }

      const je_doc = await databases.createDocument(
        DATABASE_ID, JE_COLLECTION, ID.unique(),
        {
          entry_number: nextJE,
          entry_date: pr.return_date || now.slice(0, 10),
          source_type: "purchase_return",
          source_id: purchase_return_id,
          description: `PR ${pr.return_number} — ${po.po_number}`,
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
          DATABASE_ID, JEL_COLLECTION, ID.unique(),
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

      // Update PO status
      const newPOStatus = determinePOStatusAfterReturn(cumulative_received, cumulative_returned, po_items);
      await databases.updateDocument(DATABASE_ID, PO_COLLECTION, po.$id, {
        status: newPOStatus, updated_by: created_by, updated_at: now,
      });

      // Mark PR posted
      await databases.updateDocument(DATABASE_ID, PR_COLLECTION, purchase_return_id, {
        status: "posted", posted_by: created_by, posted_at: now,
      });

      return res.json({
        ok: true, posted: true, movement_count: pr_items.length,
        journal_entry_id: je_doc.$id, new_po_status: newPOStatus, updated_products: updatedProducts,
      });
    }

    // No PO — simple return (stock + journal only, no PO status update)
    const po_items_map_simple = new Map();
    for (const ri of pr_items) {
      po_items_map_simple.set(ri.product_id, { product_id: ri.product_id, unit_price: ri.unit_price, quantity: ri.quantity });
    }
    const plan_simple = buildPRJournalPlan({ pr_items, po_items_map: po_items_map_simple });
    if (plan_simple.error === "total_zero") {
      return res.json({ ok: false, errors: { _form: "Total nol." } }, 400);
    }

    const coa_accounts = await databases.listDocuments(DATABASE_ID, COA_COLLECTION, [Query.equal("is_active", [true])]);
    const coa_map = new Map(coa_accounts.documents.map((a) => [a.code, a]));
    const inv = coa_map.get("1110");
    const ap = coa_map.get("2110");
    if (!inv || !ap) {
      return res.json({ ok: false, errors: { _form: "Akun 1110/2110 tidak ditemukan di COA." } }, 500);
    }
    plan_simple.lines[0].account_id = ap.$id;
    plan_simple.lines[1].account_id = inv.$id;

    const now2 = new Date().toISOString();
    const updatedProducts2 = [];

    for (const ri of pr_items) {
      const qty = -Number(ri.quantity);
      const existing = await databases.listDocuments(DATABASE_ID, MOVEMENTS_COLLECTION, [
        Query.equal("product_id", [ri.product_id]),
        Query.equal("movement_type", ["purchase_return"]),
        Query.equal("source_type", ["purchase_return"]),
        Query.equal("source_id", [purchase_return_id]),
        Query.limit(1),
      ]);
      if (existing.documents.length > 0) continue;

      const movements = await listByField(databases, MOVEMENTS_COLLECTION, "product_id", ri.product_id);
      const newStock = currentStockOf(movements) + qty;

      await databases.createDocument(
        DATABASE_ID, MOVEMENTS_COLLECTION, ID.unique(),
        {
          product_id: ri.product_id,
          movement_type: "purchase_return",
          quantity_delta: qty,
          source_type: "purchase_return",
          source_id: purchase_return_id,
          note: `PR ${pr.return_number}`.slice(0, 500),
          created_by,
          created_at: now2,
        },
        MOVEMENT_READ_LABELS.map((label) => Permission.read(Role.label(label)))
      );

      await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, ri.product_id, {
        current_stock: newStock,
        updated_at: now2,
        updated_by: created_by,
      });
      updatedProducts2.push({ product_id: ri.product_id, current_stock: newStock });
    }

    const all_entries2 = await databases.listDocuments(DATABASE_ID, JE_COLLECTION, [Query.orderDesc("entry_number"), Query.limit(1)]);
    let nextJE2 = "JE-001";
    if (all_entries2.documents.length > 0) {
      const m = all_entries2.documents[0].entry_number.match(/JE-(\d+)/);
      if (m) nextJE2 = `JE-${String(parseInt(m[1], 10) + 1).padStart(3, "0")}`;
    }

    const je_doc2 = await databases.createDocument(
      DATABASE_ID, JE_COLLECTION, ID.unique(),
      {
        entry_number: nextJE2,
        entry_date: pr.return_date || now2.slice(0, 10),
        source_type: "purchase_return",
        source_id: purchase_return_id,
        description: `PR ${pr.return_number}`,
        total_debit: plan_simple.total_amount,
        total_credit: plan_simple.total_amount,
        status: "posted",
        created_by: "system",
        created_at: now2,
      },
      MOVEMENT_READ_LABELS.map((label) => Permission.read(Role.label(label)))
    );

    for (const line of plan_simple.lines) {
      await databases.createDocument(
        DATABASE_ID, JEL_COLLECTION, ID.unique(),
        {
          journal_entry_id: je_doc2.$id,
          account_id: line.account_id,
          debit: line.debit,
          credit: line.credit,
          description: line.description,
        },
        MOVEMENT_READ_LABELS.map((label) => Permission.read(Role.label(label)))
      );
    }

    await databases.updateDocument(DATABASE_ID, PR_COLLECTION, purchase_return_id, {
      status: "posted", posted_by: created_by, posted_at: now2,
    });

    return res.json({
      ok: true, posted: true, movement_count: pr_items.length,
      journal_entry_id: je_doc2.$id, updated_products: updatedProducts2,
    });
  } catch (e) {
    if (e.code === 404) return res.json({ ok: false, errors: { _form: "PR atau PO tidak ditemukan." } }, 404);
    error(String(e));
    return res.json({ ok: false, errors: { _form: "postPurchaseReturn gagal: " + e.message } }, 500);
  }
}

async function handlePostSalesInvoice(databases, payload, res, error) {
  const { sales_invoice_id, created_by } = payload;

  try {
    error("DEBUG fetching si id=" + sales_invoice_id);
    const si = await databases.getDocument(DATABASE_ID, SI_COLLECTION, sales_invoice_id);
    error("DEBUG si fetched, status=" + si.status);
    if (si.status !== "draft") {
      return res.json(
        { ok: false, errors: { _form: `Invoice sudah ${si.status === "unpaid" || si.status === "paid" || si.status === "partial" ? "diposting" : "dibatalkan"}.` } },
        409
      );
    }

    const si_items = await listByField(databases, SI_ITEMS_COLLECTION, "sales_invoice_id", sales_invoice_id);
    if (si_items.length === 0) {
      return res.json({ ok: false, errors: { _form: "Invoice tidak memiliki item." } }, 400);
    }

    // Attach _product data for stock check
    for (const item of si_items) {
      item._product = await databases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION, item.product_id).catch(() => null);
    }

    // Stock sufficiency check (unless stock_override)
    if (!si.stock_override) {
      for (const item of si_items) {
        const movements = await listByField(databases, MOVEMENTS_COLLECTION, "product_id", item.product_id);
        const currentStock = currentStockOf(movements);
        if (currentStock < item.quantity) {
          return res.json(
            {
              ok: false,
              errors: {
                _form: `Stok tidak cukup untuk produk ${item.product_id}: tersedia ${currentStock}, dibutuhkan ${item.quantity}.`,
                stock_insufficient: true,
                product_id: item.product_id,
                available: currentStock,
                required: item.quantity,
              },
            },
            409
          );
        }
      }
    }

    // Build journal plan
    const coa_accounts = await databases.listDocuments(DATABASE_ID, COA_COLLECTION, [Query.equal("is_active", [true])]);
    const coa_map = new Map(coa_accounts.documents.map((a) => [a.code, a]));
    const ar_acct = coa_map.get("1120");
    const rev_acct = coa_map.get("4100");
    if (!ar_acct || !rev_acct) {
      return res.json({ ok: false, errors: { _form: "Akun 1120/4100 tidak ditemukan di COA." } }, 500);
    }

    const now = new Date().toISOString();
    const updatedProducts = [];

    // Stock movements (negative for sales)
    for (const item of si_items) {
      const existing = await databases.listDocuments(DATABASE_ID, MOVEMENTS_COLLECTION, [
        Query.equal("product_id", [item.product_id]),
        Query.equal("movement_type", ["sales_invoice"]),
        Query.equal("source_type", ["sales_invoice"]),
        Query.equal("source_id", [sales_invoice_id]),
        Query.limit(1),
      ]);
      if (existing.documents.length > 0) continue;

      await databases.createDocument(
        DATABASE_ID, MOVEMENTS_COLLECTION, ID.unique(),
        {
          product_id: item.product_id,
          movement_type: "sales_invoice",
          quantity_delta: -item.quantity,
          source_type: "sales_invoice",
          source_id: sales_invoice_id,
          note: `Penjualan - ${si.invoice_number}`.slice(0, 500),
          created_by,
          created_at: now,
        },
        MOVEMENT_READ_LABELS.map((label) => Permission.read(Role.label(label)))
      );

      const movements = await listByField(databases, MOVEMENTS_COLLECTION, "product_id", item.product_id);
      const newStock = currentStockOf(movements);
      await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, item.product_id, {
        current_stock: newStock,
        updated_at: now,
        updated_by: created_by,
      });
      updatedProducts.push({ product_id: item.product_id, current_stock: newStock });
    }

    // Journal entry
    const all_entries = await databases.listDocuments(DATABASE_ID, JE_COLLECTION, [Query.orderDesc("entry_number"), Query.limit(1)]);
    let nextJE = "JE-001";
    if (all_entries.documents.length > 0) {
      const m = all_entries.documents[0].entry_number.match(/JE-(\d+)/);
      if (m) nextJE = `JE-${String(parseInt(m[1], 10) + 1).padStart(3, "0")}`;
    }

    const je_doc = await databases.createDocument(
      DATABASE_ID, JE_COLLECTION, ID.unique(),
      {
        entry_number: nextJE,
        entry_date: si.invoice_date || now.slice(0, 10),
        source_type: "sales_invoice",
        source_id: sales_invoice_id,
        description: `Penjualan - ${si.invoice_number}`,
        total_debit: si.total_amount,
        total_credit: si.total_amount,
        status: "posted",
        created_by: "system",
        created_at: now,
      },
      MOVEMENT_READ_LABELS.map((label) => Permission.read(Role.label(label)))
    );

    for (const line of [
      { account_id: ar_acct.$id, debit: si.total_amount, credit: 0, description: si.invoice_number },
      { account_id: rev_acct.$id, debit: 0, credit: si.total_amount, description: si.invoice_number },
    ]) {
      await databases.createDocument(
        DATABASE_ID, JEL_COLLECTION, ID.unique(),
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

    // Update SO status
    const so_items = await listByField(databases, SO_ITEMS_COLLECTION, "sales_order_id", si.sales_order_id);

    // Check total invoiced for this SO
    const all_sis = await listByField(databases, SI_COLLECTION, "sales_order_id", si.sales_order_id);
    let totalInvoiced = 0;
    for (const existing_si of all_sis) {
      if (existing_si.$id === sales_invoice_id || existing_si.status === "cancelled") continue;
      const existing_items = await listByField(databases, SI_ITEMS_COLLECTION, "sales_invoice_id", existing_si.$id);
      totalInvoiced += existing_items.reduce((sum, item) => sum + Number(item.quantity), 0);
    }
    totalInvoiced += si_items.reduce((sum, item) => sum + Number(item.quantity), 0);

    const totalSOQty = so_items.reduce((sum, item) => sum + Number(item.quantity), 0);
    const newSOStatus = totalInvoiced >= totalSOQty ? "invoiced" : "partially_invoiced";

    await databases.updateDocument(DATABASE_ID, SO_COLLECTION, si.sales_order_id, {
      status: newSOStatus, updated_by: created_by, updated_at: now,
    });

    // Mark SI posted
    await databases.updateDocument(DATABASE_ID, SI_COLLECTION, sales_invoice_id, {
      status: "unpaid", posted_by: created_by, posted_at: now,
    });

    return res.json({
      ok: true, posted: true, movement_count: si_items.length,
      journal_entry_id: je_doc.$id, new_so_status: newSOStatus, updated_products: updatedProducts,
    });
  } catch (e) {
    if (e.code === 404) return res.json({ ok: false, errors: { _form: "Invoice atau data terkait tidak ditemukan." } }, 404);
    error(String(e));
    return res.json({ ok: false, errors: { _form: "postSalesInvoice gagal: " + e.message } }, 500);
  }
}

async function handlePostSalesReturn(databases, payload, res, error) {
  const { sales_return_id, created_by } = payload;
  if (!sales_return_id) return res.json({ ok: false, errors: { sales_return_id: "wajib" } }, 400);
  if (!created_by) return res.json({ ok: false, errors: { created_by: "wajib" } }, 400);

  try {
    const sr = await databases.getDocument(DATABASE_ID, SR_COLLECTION, sales_return_id);
    if (sr.status !== "draft") {
      return res.json({ ok: false, errors: { _form: `Retur sudah ${sr.status === "posted" ? "diposting" : "dibatalkan"}.` } }, 409);
    }

    const sr_items = await listByField(databases, SRI_COLLECTION, "sales_return_id", sales_return_id);
    if (sr_items.length === 0) {
      return res.json({ ok: false, errors: { _form: "Retur tidak memiliki item." } }, 400);
    }

    for (const ri of sr_items) {
      if (Number(ri.quantity) <= 0) {
        return res.json({ ok: false, errors: { _form: "Qty retur harus > 0." } }, 400);
      }
    }

    const si = await databases.getDocument(DATABASE_ID, SI_COLLECTION, sr.sales_invoice_id);

    const now = new Date().toISOString();
    const updatedProducts = [];

    // Create positive stock_movements (restore stock)
    for (const ri of sr_items) {
      const movements = await databases.listDocuments(DATABASE_ID, MOVEMENTS_COLLECTION, [
        Query.equal("product_id", [ri.product_id]),
        Query.limit(5000),
      ]);
      const currentStock = movements.documents.reduce((sum, m) => sum + Number(m.quantity_delta), 0);

      await databases.createDocument(DATABASE_ID, MOVEMENTS_COLLECTION, ID.unique(), {
        product_id: ri.product_id,
        movement_type: "sales_return",
        quantity_delta: Number(ri.quantity),
        source_type: "sales_return",
        source_id: sales_return_id,
        note: `Retur penjualan ${sr.return_number}`,
        created_by,
        created_at: now,
      });

      const newStock = currentStock + Number(ri.quantity);
      const prod = await databases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION, ri.product_id);
      await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, ri.product_id, {
        current_stock: newStock,
      });
      updatedProducts.push({ product_id: ri.product_id, previous_stock: currentStock, current_stock: newStock });
    }

    // Reduce SI total_amount
    const returnTotal = sr_items.reduce((sum, ri) => sum + Number(ri.quantity) * Number(ri.unit_price), 0);
    const newTotal = Math.max(0, Number(si.total_amount) - returnTotal);
    await databases.updateDocument(DATABASE_ID, SI_COLLECTION, sr.sales_invoice_id, {
      total_amount: newTotal,
    });

    // Mark SR posted
    await databases.updateDocument(DATABASE_ID, SR_COLLECTION, sales_return_id, {
      status: "posted", posted_by: created_by, posted_at: now,
    });

    return res.json({
      ok: true, posted: true, movement_count: sr_items.length,
      return_total: returnTotal, new_invoice_total: newTotal, updated_products: updatedProducts,
    });
  } catch (e) {
    if (e.code === 404) return res.json({ ok: false, errors: { _form: "Retur atau data terkait tidak ditemukan." } }, 404);
    error(String(e));
    return res.json({ ok: false, errors: { _form: "postSalesReturn gagal: " + e.message } }, 500);
  }
}

export default async ({ req, res, log, error }) => {
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

  const type = payload.type || "stock_opname";

  if (type === "stock_opname") {
    return handlePostOpname(databases, payload, res, error);
  }
  if (type === "goods_receipt") {
    return handlePostGR(databases, payload, res, error);
  }
  if (type === "purchase_return") {
    return handlePostPR(databases, payload, res, error);
  }
  if (type === "sales_invoice") {
    try {
      if (!payload?.sales_invoice_id) {
        return res.json({ ok: false, errors: { sales_invoice_id: "wajib" } }, 400);
      }
      if (!payload?.created_by) {
        return res.json({ ok: false, errors: { created_by: "wajib" } }, 400);
      }
      return await handlePostSalesInvoice(databases, payload, res, error);
    } catch (e) {
      error("UNCAUGHT sales_invoice: " + String(e));
      return res.json({ ok: false, errors: { _form: "sales_invoice uncaught: " + e.message } }, 500);
    }
  }
  if (type === "sales_return") {
    try {
      return await handlePostSalesReturn(databases, payload, res, error);
    } catch (e) {
      error("UNCAUGHT sales_return: " + String(e));
      return res.json({ ok: false, errors: { _form: "sales_return uncaught: " + e.message } }, 500);
    }
  }

  return res.json({ ok: false, errors: { _form: `Type tidak dikenal: ${type}` } }, 400);
};
