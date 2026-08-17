import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Client, Databases, Functions, ID, Query } from "node-appwrite";

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

const FUNCTION_ID = "post-stock-opname";
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
  return {
    statusCode: run.responseStatusCode,
    parsed: JSON.parse(run.responseBody || "{}"),
  };
}

async function product() {
  return (
    await databases.listDocuments("erp", "products", [Query.equal("sku", ["AM-600"])])
  ).documents[0];
}

async function createOpname(items, { cancel = false } = {}) {
  const stamp = Date.now();
  const doc = await databases.createDocument("erp", "stock_opnames", ID.unique(), {
    opname_number: `OP-DEV-${stamp}`,
    opname_date: "2026-08-16",
    status: cancel ? "cancelled" : "draft",
    note: "uji live postStockOpname",
    created_by: ACTOR,
    created_at: new Date().toISOString(),
  });
  for (const item of items) {
    await databases.createDocument("erp", "stock_opname_items", ID.unique(), {
      stock_opname_id: doc.$id,
      product_id: item.product_id,
      system_qty: item.system_qty,
      actual_qty: item.actual_qty,
      difference: item.actual_qty - item.system_qty,
      note: item.note ?? "",
    });
  }
  return doc;
}

async function cleanup(opnameIds = []) {
  for (const id of opnameIds) {
    let page = await databases.listDocuments("erp", "stock_opname_items", [
      Query.equal("stock_opname_id", [id]),
      Query.limit(100),
    ]);
    for (const doc of page.documents) {
      await databases.deleteDocument("erp", "stock_opname_items", doc.$id);
    }
    await databases.deleteDocument("erp", "stock_opnames", id);
  }
}

const p = await product();
const baseline = Number(p.current_stock);
const OPN_IDS = [];

// 1. posting draft dengan selisih +5 (nol di-skip)
const opn1 = await createOpname([
  { product_id: p.$id, system_qty: baseline, actual_qty: baseline + 5 },
  { product_id: p.$id, system_qty: baseline + 5, actual_qty: baseline + 5 },
]);
OPN_IDS.push(opn1.$id);
let r = await exec({ stock_opname_id: opn1.$id, created_by: ACTOR, allow_negative: true });
t(
  "posting opname -> ok, 1 movement, stok naik 5",
  r.statusCode === 200 && r.parsed.ok && r.parsed.movement_count === 1 && r.parsed.updated_products[0].current_stock === baseline + 5,
  JSON.stringify(r)
);
let movs = await databases.listDocuments("erp", "stock_movements", [
  Query.equal("source_type", ["stock_opname"]),
  Query.equal("source_id", [opn1.$id]),
]);
t("movement stock_opname tercatat (source opname)", movs.total === 1 && movs.documents[0].movement_type === "stock_opname", JSON.stringify(movs.total));
t("quantity_delta = selisih (+5)", Number(movs.documents[0].quantity_delta) === 5);

// 2. posting ulang opname yang sudah posted -> 409
r = await exec({ stock_opname_id: opn1.$id, created_by: ACTOR, allow_negative: true });
t("posting ulang -> 409", r.statusCode === 409 && /di-posting/.test(r.parsed.errors._form), JSON.stringify(r));

// 3. opname status cancelled -> 409
const opnCancel = await createOpname([{ product_id: p.$id, system_qty: 0, actual_qty: 1 }], { cancel: true });
OPN_IDS.push(opnCancel.$id);
r = await exec({ stock_opname_id: opnCancel.$id, created_by: ACTOR, allow_negative: true });
t("opname cancelled -> 409", r.statusCode === 409, JSON.stringify(r));

// 4. opname tidak ada -> 404
r = await exec({ stock_opname_id: "9".repeat(36), created_by: ACTOR });
t("opname tidak ada -> 404", r.statusCode === 404, JSON.stringify(r));

// 5. item selisih negatif (actual < system) -> stok turun
const opn2 = await createOpname([
  { product_id: p.$id, system_qty: baseline + 5, actual_qty: baseline + 3 },
]);
OPN_IDS.push(opn2.$id);
r = await exec({ stock_opname_id: opn2.$id, created_by: ACTOR, allow_negative: true });
t(
  "selisih negatif -> stok turun 2",
  r.parsed.ok && r.parsed.updated_products[0].difference === -2 && r.parsed.updated_products[0].current_stock === baseline + 3,
  JSON.stringify(r)
);

// 6. tanpa item -> 400
const opnEmpty = await createOpname([]);
OPN_IDS.push(opnEmpty.$id);
r = await exec({ stock_opname_id: opnEmpty.$id, created_by: ACTOR });
t("opname tanpa item -> 400", r.statusCode === 400, JSON.stringify(r));

// 7. semua selisih nol -> 400
const opnZero = await createOpname([{ product_id: p.$id, system_qty: baseline + 3, actual_qty: baseline + 3 }]);
OPN_IDS.push(opnZero.$id);
r = await exec({ stock_opname_id: opnZero.$id, created_by: ACTOR });
t("semua selisih nol -> 400", r.statusCode === 400, JSON.stringify(r));

// 8. input tidak valid -> 400
r = await exec({ created_by: ACTOR });
t("stock_opname_id kosong -> 400", r.statusCode === 400, JSON.stringify(r));

// 9. status opname menjadi posted
const postedOpn = await databases.getDocument("erp", "stock_opnames", opn1.$id);
t("opname berstatus posted + posted_by", postedOpn.status === "posted" && postedOpn.posted_by === ACTOR, JSON.stringify(postedOpn));

const finalProduct = await product();
t(
  "current_stock sinkron = baseline + 3",
  Number(finalProduct.current_stock) === baseline + 3,
  `expected ${baseline + 3}, got ${finalProduct.current_stock}`
);

await cleanup(OPN_IDS);

// reset stok ke baseline via adjustStock manual_adjustment
const adjust = await functions.createExecution({
  functionId: "adjust-stock",
  body: JSON.stringify({
    product_id: p.$id,
    movement_type: "manual_adjustment",
    quantity_delta: baseline - (baseline + 3),
    source_type: "manual_adjustment",
    source_id: "RESET-OPN-DEV-001",
    created_by: ACTOR,
    allow_negative: true,
  }),
  async: false,
});
const reset = JSON.parse(adjust.responseBody || "{}");
t(
  "stok dev dikembalikan ke baseline",
  reset.ok && reset.current_stock === baseline,
  JSON.stringify(reset)
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
