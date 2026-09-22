export type VariantInput = {
  product_id: string;
  size: string;
  color: string;
  sku: string;
  barcode?: string;
  sell_price?: number | null;
  min_stock: number;
};

export type ValidationResult = { ok: true } | { ok: false; errors: Record<string, string> };

export function validateVariantInput(i: VariantInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!i.product_id?.trim()) {
    errors.product_id = "Produk wajib dipilih.";
  }

  const size = i.size?.trim() ?? "";
  const color = i.color?.trim() ?? "";
  if (!size && !color) {
    errors.size = "Ukuran atau warna minimal satu harus diisi.";
  }

  if (!i.sku?.trim()) {
    errors.sku = "SKU wajib diisi.";
  } else if (i.sku.trim().length > 255) {
    errors.sku = "SKU maksimal 255 karakter.";
  }

  if (!Number.isFinite(i.min_stock) || i.min_stock < 0) {
    errors.min_stock = "Stok minimum harus angka 0 atau lebih.";
  }

  if (i.sell_price !== undefined && i.sell_price !== null) {
    if (!Number.isFinite(i.sell_price) || (i.sell_price as number) < 0) {
      errors.sell_price = "Harga jual harus angka 0 atau lebih.";
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
