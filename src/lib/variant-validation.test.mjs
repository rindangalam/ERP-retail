import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateVariantInput } from "./variant-validation.ts";

describe("validateVariantInput", () => {
  it("menolak size+color kosong bersamaan", () => {
    const result = validateVariantInput({
      product_id: "prod_123",
      size: "",
      color: "   ",
      sku: "SKU-001",
      min_stock: 0,
    });
    assert.equal(result.ok, false);
    assert.ok(result.ok === false && ("size" in result.errors || "color" in result.errors));
  });

  it("menolak SKU kosong", () => {
    const result = validateVariantInput({
      product_id: "prod_123",
      size: "M",
      color: "",
      sku: "   ",
      min_stock: 0,
    });
    assert.equal(result.ok, false);
    assert.ok(result.ok === false && "sku" in result.errors);
  });

  it("menolak min_stock negatif", () => {
    const result = validateVariantInput({
      product_id: "prod_123",
      size: "M",
      color: "Hitam",
      sku: "SKU-001",
      min_stock: -1,
    });
    assert.equal(result.ok, false);
    assert.ok(result.ok === false && "min_stock" in result.errors);
  });

  it("menerima input valid", () => {
    const result = validateVariantInput({
      product_id: "prod_123",
      size: "M",
      color: "Hitam",
      sku: "SKU-001",
      barcode: "1234567890",
      sell_price: 149000,
      min_stock: 2,
    });
    assert.equal(result.ok, true);
  });
});
