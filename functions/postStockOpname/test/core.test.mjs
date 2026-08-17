import { validatePostOpnameInput, buildAdjustments } from "../src/core.js";

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

// --- validatePostOpnameInput ---
t(
  "input valid",
  Object.keys(validatePostOpnameInput({ stock_opname_id: "a".repeat(36), created_by: "u1" }).errors).length === 0
);
t(
  "stock_opname_id kosong ditolak",
  validatePostOpnameInput({ stock_opname_id: "", created_by: "u1" }).errors.stock_opname_id
);
t(
  "created_by kosong ditolak",
  validatePostOpnameInput({ stock_opname_id: "x", created_by: "" }).errors.created_by
);
t(
  "allow_negative default false",
  validatePostOpnameInput({ stock_opname_id: "x", created_by: "u1" }).allowNegative === false
);
t(
  "allow_negative true",
  validatePostOpnameInput({ stock_opname_id: "x", created_by: "u1", allow_negative: true }).allowNegative === true
);

// --- buildAdjustments ---
const items = [
  { product_id: "p1", system_qty: 10, actual_qty: 12 }, // +2
  { product_id: "p2", system_qty: 10, actual_qty: 7 }, // -3
  { product_id: "p3", system_qty: 10, actual_qty: 10 }, // nol -> skip
  { product_id: "p4", system_qty: 0, actual_qty: 0 }, // nol -> skip
];
const r = buildAdjustments(items);
t(
  "selisih tidak nol dihasilkan (+2, -3)",
  r.adjustments.length === 2 && r.adjustments[0].difference === 2 && r.adjustments[1].difference === -3,
  JSON.stringify(r.adjustments)
);
t("selisih nol di-skip", r.adjustments.every((a) => a.difference !== 0));
t("tidak ada error untuk item valid", Object.keys(r.errors).length === 0);

const bad = buildAdjustments([
  { product_id: "", system_qty: 1, actual_qty: 2 },
  { product_id: "p2", system_qty: -1, actual_qty: 2 },
  { product_id: "p3", system_qty: 1, actual_qty: "abc" },
]);
t("product_id kosong ditolak", bad.errors["items.0.product_id"]);
t("system_qty negatif ditolak", bad.errors["items.1.system_qty"]);
t("actual_qty bukan angka ditolak", bad.errors["items.2.actual_qty"]);
t("item error tidak masuk adjustments", bad.adjustments.length === 0);

const empty = buildAdjustments([]);
t("tanpa item -> adjustment kosong", empty.adjustments.length === 0 && Object.keys(empty.errors).length === 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
