export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

export type ProductInput = {
  sku: string;
  name: string;
  barcode?: string;
  category_id: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  min_stock: number;
};

export type CategoryInput = {
  name: string;
  description?: string;
};

export function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase();
}

export function validateProductInput(input: ProductInput): ValidationResult {
  const errors: Record<string, string> = {};

  const sku = normalizeSku(input.sku);
  if (!sku) errors.sku = "SKU wajib diisi.";
  else if (sku.length > 255) errors.sku = "SKU maksimal 255 karakter.";

  if (!input.name?.trim()) errors.name = "Nama produk wajib diisi.";
  else if (input.name.trim().length > 255) errors.name = "Nama produk maksimal 255 karakter.";

  if (input.barcode && input.barcode.trim().length > 255) {
    errors.barcode = "Barcode maksimal 255 karakter.";
  }

  if (!input.category_id) errors.category_id = "Kategori wajib dipilih.";

  if (!input.unit?.trim()) errors.unit = "Satuan wajib diisi.";
  else if (input.unit.trim().length > 50) errors.unit = "Satuan maksimal 50 karakter.";

  if (!Number.isFinite(input.cost_price) || input.cost_price < 0) {
    errors.cost_price = "Harga beli harus angka 0 atau lebih.";
  }

  if (!Number.isFinite(input.sell_price) || input.sell_price < 0) {
    errors.sell_price = "Harga jual harus angka 0 atau lebih.";
  }

  if (!Number.isFinite(input.min_stock) || input.min_stock < 0) {
    errors.min_stock = "Stok minimum harus angka 0 atau lebih.";
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}

export function validateCategoryInput(input: CategoryInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.name?.trim()) errors.name = "Nama kategori wajib diisi.";
  else if (input.name.trim().length > 255) errors.name = "Nama kategori maksimal 255 karakter.";

  if (input.description && input.description.trim().length > 500) {
    errors.description = "Deskripsi maksimal 500 karakter.";
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
