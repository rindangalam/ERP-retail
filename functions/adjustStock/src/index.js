// Appwrite Function: satu-satunya jalur resmi menulis stock_movements dan
// men-sinkronkan products.current_stock dari akumulasi stock_movements.
import { Client, Databases, ID, Permission, Query, Role } from "node-appwrite";
import { validateAdjustStockInput, planAdjustment } from "./core.js";

const DATABASE_ID = process.env.ERP_DATABASE_ID || "erp";
const PRODUCTS_COLLECTION = process.env.ERP_PRODUCTS_COLLECTION || "products";
const MOVEMENTS_COLLECTION = process.env.ERP_STOCK_MOVEMENTS_COLLECTION || "stock_movements";

const MOVEMENT_READ_LABELS = ["admin", "warehouse", "finance"];

async function collectMovements(databases, productId) {
  const all = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const page = await databases.listDocuments(DATABASE_ID, MOVEMENTS_COLLECTION, [
      Query.equal("product_id", [productId]),
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

  const { errors, quantityDelta, allowNegative } = validateAdjustStockInput(payload);
  if (Object.keys(errors).length > 0) {
    return res.json({ ok: false, errors }, 400);
  }

  const { product_id, movement_type, source_type, source_id } = payload;

  try {
    const product = await databases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION, product_id);
    if (!product || !product.is_active) {
      return res.json({ ok: false, errors: { _form: "Produk tidak ditemukan." } }, 404);
    }

    // Idempotensi: retry (source sama) tidak boleh mencatat dua kali.
    const existing = await databases.listDocuments(DATABASE_ID, MOVEMENTS_COLLECTION, [
      Query.equal("product_id", [product_id]),
      Query.equal("movement_type", [movement_type]),
      Query.equal("source_type", [source_type]),
      Query.equal("source_id", [source_id]),
      Query.limit(1),
    ]);

    const currentStock = currentStockOf(await collectMovements(databases, product_id));
    const plan = planAdjustment({
      existingMovement: existing.documents[0],
      currentStock,
      quantityDelta,
      allowNegative,
    });

    if (plan.duplicate) {
      return res.json({ ok: true, duplicate: true, movementId: plan.movementId, current_stock: currentStock });
    }

    if (plan.error === "stock_insufficient") {
      return res.json(
        { ok: false, errors: { _form: "Stok tidak cukup.", available: plan.available } },
        409
      );
    }

    const now = new Date().toISOString();
    const movement = await databases.createDocument(
      DATABASE_ID,
      MOVEMENTS_COLLECTION,
      ID.unique(),
      {
        product_id,
        movement_type,
        quantity_delta: quantityDelta,
        source_type,
        source_id,
        note: typeof payload.note === "string" ? payload.note.slice(0, 500) : "",
        created_by: payload.created_by,
        created_at: now,
      },
      MOVEMENT_READ_LABELS.map((label) => Permission.read(Role.label(label)))
    );

    await databases.updateDocument(DATABASE_ID, PRODUCTS_COLLECTION, product_id, {
      current_stock: plan.newStock,
      updated_at: now,
      updated_by: payload.created_by,
    });

    return res.json({
      ok: true,
      duplicate: false,
      movementId: movement.$id,
      current_stock: plan.newStock,
    });
  } catch (e) {
    error(String(e));
    return res.json({ ok: false, errors: { _form: "adjustStock gagal: " + e.message } }, 500);
  }
};
