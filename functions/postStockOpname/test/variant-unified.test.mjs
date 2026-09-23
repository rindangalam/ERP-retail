import test from "node:test";
import assert from "node:assert/strict";
import {
  getVariantGuardError,
  validateVariantsStrict,
  isDuplicateForVariant,
} from "../src/core.js";

function vmap(entries) {
  return new Map(entries);
}

// ─── GR: 404 tak dikenal ───
test("unified GR: varian tak dikenal -> 404 _form+product_id", () => {
  const r = validateVariantsStrict(
    [{ product_id: "p1", product_variant_id: "v-ghost" }],
    vmap([])
  );
  assert.ok(r, "harus ada error");
  assert.equal(r.status, 404);
  assert.deepEqual(r.errors, { _form: "Varian v-ghost tidak ditemukan.", product_id: "p1" });
});

// ─── GR: 400 kepemilikan ───
test("unified GR: varian asing -> 400 _form", () => {
  const r = validateVariantsStrict(
    [{ product_id: "p1", product_variant_id: "vX" }],
    vmap([["vX", { product_id: "p9" }]])
  );
  assert.equal(r.status, 400);
  assert.deepEqual(r.errors, { _form: "Varian vX bukan milik produk p1.", product_id: "p1" });
});

// ─── opname: adjustments shape sama ───
test("unified opname: adjustment bervarian valid -> null (lolos)", () => {
  const r = validateVariantsStrict(
    [{ product_id: "p1", product_variant_id: "v1", difference: 2 }],
    vmap([["v1", { product_id: "p1" }]])
  );
  assert.equal(r, null);
});

// ─── PR: valid lolos ───
test("unified PR: varian valid -> null", () => {
  const r = validateVariantsStrict(
    [{ product_id: "p1", product_variant_id: "v1" }],
    vmap([["v1", { product_id: "p1" }]])
  );
  assert.equal(r, null);
});

// ─── SR: 404 sebelum write ───
test("unified SR: varian tak dikenal -> 404", () => {
  const r = validateVariantsStrict(
    [{ product_id: "p1", product_variant_id: "v-ghost" }],
    vmap([])
  );
  assert.equal(r.status, 404);
  assert.equal(r.errors.product_id, "p1");
});

// ─── invoice: 400 kepemilikan ───
test("unified invoice: varian asing -> 400", () => {
  const r = validateVariantsStrict(
    [{ product_id: "p1", product_variant_id: "vX" }],
    vmap([["vX", { product_id: "p9" }]])
  );
  assert.equal(r.status, 400);
});

// ─── null backward-compat ───
test("unified: tanpa varian (null/absen) -> null", () => {
  assert.equal(validateVariantsStrict([{ product_id: "p1" }], vmap([])), null);
  assert.equal(
    validateVariantsStrict([{ product_id: "p1", product_variant_id: null }], vmap([])),
    null
  );
});

// ─── urutan: gagal di item pertama ───
test("unified: gagal di item pertama (validasi-sebelum-write)", () => {
  const r = validateVariantsStrict(
    [
      { product_id: "p1", product_variant_id: "v-ghost" },
      { product_id: "p2", product_variant_id: "v2" },
    ],
    vmap([["v2", { product_id: "p2" }]])
  );
  assert.equal(r.status, 404);
  assert.equal(r.errors.product_id, "p1");
});

// ─── getVariantGuardError lenient (builder) vs strict (handler) ───
test("guard lenient: tak dikenal -> null (builder preservasi)", () => {
  const r = getVariantGuardError("v-ghost", "p1", vmap([]), { strictExistence: false });
  assert.equal(r, null);
});

test("guard strict: tak dikenal -> 404 (handler)", () => {
  const r = getVariantGuardError("v-ghost", "p1", vmap([]), { strictExistence: true });
  assert.ok(r && r.status === 404);
  assert.equal(r.message, "Varian v-ghost tidak ditemukan.");
});

test("guard: kepemilikan salah -> 400 di kedua mode", () => {
  const lenient = getVariantGuardError("vX", "p1", vmap([["vX", { product_id: "p9" }]]), {
    strictExistence: false,
  });
  const strict = getVariantGuardError("vX", "p1", vmap([["vX", { product_id: "p9" }]]), {
    strictExistence: true,
  });
  assert.equal(lenient.status, 400);
  assert.equal(strict.status, 400);
  assert.equal(lenient.message, "Varian vX bukan milik produk p1.");
});

// ─── duplikat per-varian ───
test("duplikat: varian sama -> true, varian beda -> false, null -> length>0", () => {
  assert.equal(
    isDuplicateForVariant([{ product_variant_id: "v1" }], "v1"),
    true
  );
  assert.equal(
    isDuplicateForVariant([{ product_variant_id: "v1" }], "v2"),
    false
  );
  assert.equal(isDuplicateForVariant([{ a: 1 }], null), true);
  assert.equal(isDuplicateForVariant([], null), false);
  // backward-compat null: movement tanpa varian cocok dengan null
  assert.equal(isDuplicateForVariant([{ product_variant_id: null }], null), true);
  assert.equal(isDuplicateForVariant([{}], null), true);
});
