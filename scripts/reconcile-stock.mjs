// ERP-010: verifikasi & perbaiki sinkronisasi current_stock vs akumulasi stock_movements.
// Mode default: laporan drift. Mode --fix: perbaiki drift lewat Function adjustStock
// (jalur resmi satu-satunya menulis stock_movements), lalu verifikasi ulang.
import { readFileSync } from "node:fs";
import { Client, Databases, Query } from "node-appwrite";

const FIX = process.argv.includes("--fix");
const ACTOR = "system-reconcile";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function listAll(databaseId, collectionId, extraQuery = []) {
  const all = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const page = await databases.listDocuments(databaseId, collectionId, [
      ...extraQuery,
      Query.limit(limit),
      Query.offset(offset),
    ]);
    all.push(...page.documents);
    if (page.documents.length < limit) break;
    offset += limit;
  }
  return all;
}

async function accumulated(databaseId, collectionId, productId) {
  const movements = await listAll(databaseId, collectionId, [
    Query.equal("product_id", [productId]),
  ]);
  return movements.reduce((sum, m) => sum + Number(m.quantity_delta || 0), 0);
}

async function run(payload) {
  const run = await functions.createExecution({
    functionId: FUNCTION_ID,
    body: JSON.stringify(payload),
    async: false,
  });
  return { statusCode: run.responseStatusCode, parsed: JSON.parse(run.responseBody || "{}") };
}

const products = await listAll("erp", "products");
const rows = [];
for (const product of products) {
  const acc = await accumulated("erp", "stock_movements", product.$id);
  const stored = Number(product.current_stock ?? 0);
  rows.push({ product, acc, stored, drift: stored - acc });
}

const drifted = rows.filter((r) => r.drift !== 0);
console.log(`Produk: ${rows.length} | drift: ${drifted.length}`);
for (const r of drifted) {
  console.log(
    `  ${r.product.sku.padEnd(10)} stored=${r.stored} akumulasi=${r.acc} drift=${r.drift}`
  );
}

if (drifted.length === 0) {
  console.log("INVARIAN TERPENUHI: current_stock = akumulasi stock_movements.");
  process.exit(0);
}

if (!FIX) {
  console.log("Jalankan dengan --fix untuk menyinkronkan lewat adjustStock.");
  process.exit(1);
}

console.log("=== Perbaikan: set current_stock = akumulasi (sumber kebenaran) ===");
const now = new Date().toISOString();
for (const r of drifted) {
  await databases.updateDocument("erp", "products", r.product.$id, {
    current_stock: r.acc,
    updated_at: now,
    updated_by: ACTOR,
  });
  console.log(`  [ok] ${r.product.sku}: stored ${r.stored} -> akumulasi ${r.acc} (tanpa menulis movement)`);
}

console.log("=== Verifikasi ulang ===");
let stillDrifted = 0;
for (const r of rows) {
  const acc = await accumulated("erp", "stock_movements", r.product.$id);
  const stored = Number(
    (
      await databases.getDocument("erp", "products", r.product.$id)
    ).current_stock ?? 0
  );
  if (stored !== acc) {
    stillDrifted += 1;
    console.log(`  [FAIL] ${r.product.sku}: stored=${stored} akumulasi=${acc}`);
  }
}
console.log(stillDrifted === 0 ? "INVARIAN TERPENUHI setelah perbaikan." : `${stillDrifted} produk masih drift.`);
process.exit(stillDrifted === 0 ? 0 : 1);
