import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Client, Databases, Functions, Query } from "node-appwrite";

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

const functions = new Functions(client);
const databases = new Databases(client);

const FUNCTION_ID = "adjust-stock";
const PRODUCT_SKU = "AM-600";
const ACTOR = "system-test";

let passed = 0;
let failed = 0;
function t(name, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`[PASS] ${name}`);
  } else {
    failed += 1;
    console.log(`[FAIL] ${name} | ${detail}`);
  }
}

async function exec(body) {
  const run = await functions.createExecution({
    functionId: FUNCTION_ID,
    body: JSON.stringify(body),
    async: false,
  });
  let parsed = null;
  try {
    parsed = JSON.parse(run.responseBody || "");
  } catch {
    parsed = run.responseBody;
  }
  return { statusCode: run.responseStatusCode, response: parsed, raw: run.responseBody };
}

async function getProduct() {
  const list = await databases.listDocuments("erp", "products", [
    Query.equal("sku", [PRODUCT_SKU]),
  ]);
  return list.documents[0];
}

async function countMovements(productId) {
  const list = await databases.listDocuments("erp", "stock_movements", [
    Query.equal("product_id", [productId]),
  ]);
  return list.total;
}

const product = await getProduct();
assert.ok(product, "Produk AM-600 harus ada.");
const productId = product.$id;

const beforeStock = Number(product.current_stock);
const beforeMovements = await countMovements(productId);

// 1. stok masuk via goods_receipt
let r = await exec({
  product_id: productId,
  movement_type: "goods_receipt",
  quantity_delta: 100,
  source_type: "goods_receipt",
  source_id: "GR-TEST-001",
  created_by: ACTOR,
});
t(
  "goods_receipt +100 -> ok, stock bertambah",
  r.statusCode === 200 && r.response.ok === true && r.response.current_stock === beforeStock + 100,
  JSON.stringify(r)
);

// 2. retry payload sama -> duplicate, tidak double-apply
r = await exec({
  product_id: productId,
  movement_type: "goods_receipt",
  quantity_delta: 100,
  source_type: "goods_receipt",
  source_id: "GR-TEST-001",
  created_by: ACTOR,
});
t(
  "retry -> duplicate:true, stock tidak berubah",
  r.response.duplicate === true && r.response.current_stock === beforeStock + 100,
  JSON.stringify(r)
);
t(
  "retry -> jumlah movement tetap 1",
  (await countMovements(productId)) === beforeMovements + 1,
  ""
);

// 3. stok negatif diblokir tanpa override
r = await exec({
  product_id: productId,
  movement_type: "sales_invoice",
  quantity_delta: -150,
  source_type: "sales_invoice",
  source_id: "INV-TEST-001",
  created_by: ACTOR,
});
t(
  "pengurangan berlebih -> 409 stock_insufficient",
  r.statusCode === 409 && r.response.errors._form.includes("tidak cukup") && r.response.errors.available === beforeStock + 100,
  JSON.stringify(r)
);

// 4. stok negatif diizinkan dengan allow_negative
r = await exec({
  product_id: productId,
  movement_type: "sales_invoice",
  quantity_delta: -150,
  source_type: "sales_invoice",
  source_id: "INV-TEST-001",
  created_by: ACTOR,
  allow_negative: true,
});
t(
  "allow_negative -> stok jadi negatif",
  r.response.ok === true && r.response.current_stock === beforeStock - 50,
  JSON.stringify(r)
);
const allowNegativeStock = r.response.current_stock;

// 5. input tidak valid -> 400
r = await exec({
  product_id: productId,
  movement_type: "refund",
  quantity_delta: 10,
  source_type: "goods_receipt",
  source_id: "X",
  created_by: ACTOR,
});
t("movement_type invalid -> 400", r.statusCode === 400 && r.response.errors.movement_type, JSON.stringify(r));

// 6. kembalikan stok ke baseline via manual_adjustment
const needed = beforeStock - allowNegativeStock;
r = await exec({
  product_id: productId,
  movement_type: "manual_adjustment",
  quantity_delta: needed,
  source_type: "manual_adjustment",
  source_id: "RESET-DEV-001",
  created_by: ACTOR,
});
t(
  "manual_adjustment reset -> stock kembali baseline",
  r.response.ok === true && r.response.current_stock === beforeStock,
  JSON.stringify(r)
);

const finalProduct = await getProduct();
t(
  "current_stock di products sinkron",
  Number(finalProduct.current_stock) === beforeStock,
  `expected ${beforeStock}, got ${finalProduct.current_stock}`
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
