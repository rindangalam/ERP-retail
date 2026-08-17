import assert from "node:assert/strict";
import { validateAdjustStockInput, planAdjustment } from "../src/core.js";

const baseInput = {
  product_id: "prod-1",
  movement_type: "goods_receipt",
  quantity_delta: 100,
  source_type: "goods_receipt",
  source_id: "GR-001",
  created_by: "user-1",
};

let passed = 0;
function t(name, fn) {
  fn();
  passed += 1;
  console.log(`[PASS] ${name}`);
}

t("input valid", () => {
  const { errors, quantityDelta, allowNegative } = validateAdjustStockInput(baseInput);
  assert.deepEqual(errors, {});
  assert.equal(quantityDelta, 100);
  assert.equal(allowNegative, false);
});

t("quantity_delta nol ditolak", () => {
  const { errors } = validateAdjustStockInput({ ...baseInput, quantity_delta: 0 });
  assert.ok(errors.quantity_delta);
});

t("quantity_delta non-angka ditolak", () => {
  const { errors } = validateAdjustStockInput({ ...baseInput, quantity_delta: "abc" });
  assert.ok(errors.quantity_delta);
});

t("movement_type tidak valid ditolak", () => {
  const { errors } = validateAdjustStockInput({ ...baseInput, movement_type: "refund" });
  assert.ok(errors.movement_type);
});

t("source_type tidak valid ditolak", () => {
  const { errors } = validateAdjustStockInput({ ...baseInput, source_type: "random" });
  assert.ok(errors.source_type);
});

t("source_id kosong ditolak", () => {
  const { errors } = validateAdjustStockInput({ ...baseInput, source_id: "" });
  assert.ok(errors.source_id);
});

t("product_id kosong ditolak", () => {
  const { errors } = validateAdjustStockInput({ ...baseInput, product_id: "" });
  assert.ok(errors.product_id);
});

t("created_by kosong ditolak", () => {
  const { errors } = validateAdjustStockInput({ ...baseInput, created_by: "" });
  assert.ok(errors.created_by);
});

t("allow_negative default false", () => {
  const { allowNegative } = validateAdjustStockInput(baseInput);
  assert.equal(allowNegative, false);
});

t("duplikat source terdeteksi (retry aman)", () => {
  const existing = { $id: "mov-1" };
  const plan = planAdjustment({ existingMovement: existing, currentStock: 100, quantityDelta: 100, allowNegative: false });
  assert.deepEqual(plan, { duplicate: true, movementId: "mov-1" });
});

t("stok masuk normal", () => {
  const plan = planAdjustment({ existingMovement: null, currentStock: 100, quantityDelta: 50, allowNegative: false });
  assert.deepEqual(plan, { newStock: 150 });
});

t("stok negatif diblokir tanpa override", () => {
  const plan = planAdjustment({ existingMovement: null, currentStock: 100, quantityDelta: -150, allowNegative: false });
  assert.deepEqual(plan, { error: "stock_insufficient", available: 100 });
});

t("stok negatif diizinkan dengan allow_negative", () => {
  const plan = planAdjustment({ existingMovement: null, currentStock: 100, quantityDelta: -150, allowNegative: true });
  assert.deepEqual(plan, { newStock: -50 });
});

console.log(`\n${passed} passed`);
