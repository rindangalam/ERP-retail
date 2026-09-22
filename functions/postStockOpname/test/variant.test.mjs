import test from "node:test";
import assert from "node:assert/strict";
import { buildSalesInvoiceJournalPlan } from "../src/core-sales-invoice.js";

const coaMap = new Map([
  ["1120", { $id: "coa-ar", code: "1120" }],
  ["4100", { $id: "coa-rev", code: "4100" }],
]);

const invoice = {
  $id: "si-1",
  invoice_number: "INV-001",
  invoice_date: "2026-09-01",
  total_amount: 100000,
};

const prod = { $id: "p1", name: "Blouse", current_stock: 10 };

function variantInfos(entries) {
  return new Map(entries);
}

test("movement varian membawa product_variant_id + delta negatif + variant_updates", () => {
  const items = [{ product_id: "p1", product_variant_id: "v1", quantity: 2, _product: prod }];
  const r = buildSalesInvoiceJournalPlan(invoice, items, coaMap, "u1", {
    variantInfos: variantInfos([["v1", { product_id: "p1", current_stock: 10 }]]),
  });
  assert.ok(!r.errors, JSON.stringify(r.errors));
  assert.equal(r.stock_movements.length, 1);
  assert.equal(r.stock_movements[0].product_variant_id, "v1");
  assert.equal(r.stock_movements[0].quantity_delta, -2);
  assert.deepEqual(r.variant_updates, [{ variant_id: "v1", delta: -2 }]);
});

test("stok varian kurang TANPA override -> errors, tanpa movement", () => {
  const items = [{ product_id: "p1", product_variant_id: "v1", quantity: 5, _product: prod }];
  const r = buildSalesInvoiceJournalPlan(invoice, items, coaMap, "u1", {
    variantInfos: variantInfos([["v1", { product_id: "p1", current_stock: 2 }]]),
  });
  assert.ok(r.errors && Object.keys(r.errors).length > 0, "harus ada errors");
  assert.ok(!r.stock_movements || r.stock_movements.length === 0, "tidak boleh ada movement");
});

test("item tanpa varian -> movement tanpa field varian (backward-compat)", () => {
  const items = [{ product_id: "p1", quantity: 1, _product: prod }];
  const r = buildSalesInvoiceJournalPlan(invoice, items, coaMap, "u1");
  assert.ok(!r.errors, JSON.stringify(r.errors));
  assert.equal(r.stock_movements.length, 1);
  assert.ok(!("product_variant_id" in r.stock_movements[0]), "field varian harus absen");
  assert.deepEqual(r.variant_updates ?? [], []);
});

test("stok varian kurang DENGAN override -> movement tetap dibuat", () => {
  const items = [{ product_id: "p1", product_variant_id: "v1", quantity: 5, _product: prod }];
  const r = buildSalesInvoiceJournalPlan(invoice, items, coaMap, "u1", {
    variantInfos: variantInfos([["v1", { product_id: "p1", current_stock: 2 }]]),
    allowOverride: true,
  });
  assert.ok(!r.errors, JSON.stringify(r.errors));
  assert.equal(r.stock_movements.length, 1);
  assert.equal(r.stock_movements[0].quantity_delta, -5);
});

test("varian milik produk lain -> errors, tanpa movement", () => {
  const items = [{ product_id: "p1", product_variant_id: "vX", quantity: 1, _product: prod }];
  const r = buildSalesInvoiceJournalPlan(invoice, items, coaMap, "u1", {
    variantInfos: variantInfos([["vX", { product_id: "p9", current_stock: 50 }]]),
  });
  assert.ok(r.errors && Object.keys(r.errors).length > 0, "harus ada errors");
  assert.ok(!r.stock_movements || r.stock_movements.length === 0, "tidak boleh ada movement");
});
