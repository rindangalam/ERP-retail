import { readFileSync } from "node:fs";
import { Client, Databases, ID, Query } from "node-appwrite";

const env = readFileSync(".env.local", "utf8");
const get = (n) => env.match(new RegExp(`^${n}=(.+)$`, "m"))?.[1]?.trim();
const endpoint = get("NEXT_PUBLIC_APPWRITE_ENDPOINT");
const projectId = get("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
const apiKey = get("APPWRITE_API_KEY");

const db = new Databases(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
const DATABASE_ID = "erp";
const CAT = "product_categories";
const PROD = "products";

async function tryCreateProduct(data) {
  try {
    await db.createDocument({
      databaseId: DATABASE_ID,
      collectionId: PROD,
      documentId: ID.unique(),
      data,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message, code: e.code };
  }
}

let results = [];
async function run() {
  // 1. validasi input via module (type-strip node)
  const mod = await import("../src/lib/inventory-validation.ts");
  const v1 = mod.validateProductInput({ sku: "  abc-1 ", name: "A", category_id: "x", unit: "pcs", cost_price: 1000, sell_price: 1500, min_stock: 5 });
  results.push(["validate ok input", v1.ok === true, JSON.stringify(v1)]);
  const v2 = mod.validateProductInput({ sku: "", name: "", category_id: "", unit: "", cost_price: -1, sell_price: -1, min_stock: -1 });
  results.push(["validate bad input rejects", v2.ok === false && Object.keys(v2.errors).length === 7, JSON.stringify(v2.errors)]);
  results.push(["normalizeSku uppercase", mod.normalizeSku("  bri-01 ") === "BRI-01", mod.normalizeSku("  bri-01 ")]);

  // 2. unique SKU via Appwrite unique index
  const cat = await db.createDocument({ databaseId: DATABASE_ID, collectionId: CAT, documentId: ID.unique(), data: { name: "Test ERP-007", is_active: true, created_by: "test", created_at: new Date().toISOString() } });
  const base = { name: "Produk Uji", category_id: cat.$id, unit: "pcs", cost_price: 1000, sell_price: 1500, min_stock: 2, current_stock: 0, is_active: true, created_by: "test", created_at: new Date().toISOString() };

  const first = await tryCreateProduct({ ...base, sku: "TEST-UNIQ-1" });
  results.push(["create product #1 ok", first.ok, first.message || ""]);

  const second = await tryCreateProduct({ ...base, sku: "TEST-UNIQ-1" });
  results.push(["duplicate SKU rejected", !second.ok && second.code === 409, second.message || ""]);

  const dupBarcode = await tryCreateProduct({ ...base, sku: "TEST-UNIQ-2", barcode: "899-777" });
  const dupBarcode2 = await tryCreateProduct({ ...base, sku: "TEST-UNIQ-3", barcode: "899-777" });
  results.push(["duplicate barcode rejected", dupBarcode.ok && !dupBarcode2.ok, dupBarcode2.message || ""]);

  // 3. cleanup
  const docs = await db.listDocuments(DATABASE_ID, PROD, [Query.equal("category_id", [cat.$id])]);
  for (const d of docs.documents) await db.deleteDocument(DATABASE_ID, PROD, d.$id);
  await db.deleteDocument(DATABASE_ID, CAT, cat.$id);
  results.push(["cleanup done", true, ""]);

  for (const [name, ok, detail] of results) {
    console.log(`[${ok ? "PASS" : "FAIL"}] ${name} | ${detail}`);
  }
  if (results.some((r) => !r[1])) process.exit(1);
}

run().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
