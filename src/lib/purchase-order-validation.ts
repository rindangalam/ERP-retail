export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

export type PurchaseOrderItemInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

export type PurchaseOrderInput = {
  supplier_id: string;
  order_date: string;
  expected_date?: string;
  notes?: string;
  items: PurchaseOrderItemInput[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validatePurchaseOrderInput(input: PurchaseOrderInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.supplier_id) errors.supplier_id = "Supplier wajib dipilih.";

  if (!input.order_date) errors.order_date = "Tanggal PO wajib diisi.";
  else if (!DATE_RE.test(input.order_date)) errors.order_date = "Format tanggal tidak valid (YYYY-MM-DD).";

  if (input.expected_date && !DATE_RE.test(input.expected_date)) {
    errors.expected_date = "Format tanggal tidak valid (YYYY-MM-DD).";
  }

  if (input.notes && input.notes.trim().length > 500) {
    errors.notes = "Catatan maksimal 500 karakter.";
  }

  if (!input.items || input.items.length === 0) {
    errors.items = "Minimal satu item produk wajib ditambahkan.";
  } else {
    const seen = new Set<string>();
    for (const item of input.items) {
      if (!item.product_id) {
        errors.items = "Ada item tanpa produk. Hapus atau lengkapi.";
        break;
      }
      if (seen.has(item.product_id)) {
        errors.items = "Produk yang sama tidak boleh muncul dua kali.";
        break;
      }
      seen.add(item.product_id);
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        errors.items = "Quantity harus lebih dari 0.";
        break;
      }
      if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
        errors.items = "Harga satuan harus 0 atau lebih.";
        break;
      }
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
