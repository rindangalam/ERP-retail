// Logika murni adjustStock — tanpa dependensi Appwrite agar bisa diuji lokal.

export const MOVEMENT_TYPES = [
  "goods_receipt",
  "sales_invoice",
  "purchase_return",
  "sales_return",
  "stock_opname",
  "manual_adjustment",
];

export const SOURCE_TYPES = [
  "goods_receipt",
  "sales_invoice",
  "purchase_return",
  "sales_return",
  "stock_opname",
  "manual_adjustment",
  "sales_payment",
  "payroll_run",
  "manual_transaction",
];

export function validateAdjustStockInput(input) {
  const errors = {};

  if (!input.product_id || typeof input.product_id !== "string") {
    errors.product_id = "product_id wajib diisi.";
  }

  if (!MOVEMENT_TYPES.includes(input.movement_type)) {
    errors.movement_type = "movement_type tidak valid.";
  }

  const quantityDelta = Number(input.quantity_delta);
  if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
    errors.quantity_delta = "quantity_delta harus angka bukan nol.";
  }

  if (!SOURCE_TYPES.includes(input.source_type)) {
    errors.source_type = "source_type tidak valid.";
  }

  if (!input.source_id || typeof input.source_id !== "string") {
    errors.source_id = "source_id wajib diisi.";
  }

  if (!input.created_by || typeof input.created_by !== "string") {
    errors.created_by = "created_by wajib diisi.";
  }

  return {
    errors,
    quantityDelta,
    allowNegative: input.allow_negative === true,
  };
}

// Keputusan inti: cek duplikat (retry), hitung stok baru, blokir stok negatif.
export function planAdjustment({ existingMovement, currentStock, quantityDelta, allowNegative }) {
  if (existingMovement) {
    return { duplicate: true, movementId: existingMovement.$id };
  }

  const newStock = currentStock + quantityDelta;

  if (newStock < 0 && !allowNegative) {
    return { error: "stock_insufficient", available: currentStock };
  }

  return { newStock };
}
