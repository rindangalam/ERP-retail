export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

export type PurchaseReturnItemInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

export type PurchaseReturnInput = {
  supplier_id: string;
  purchase_order_id?: string;
  return_date: string;
  notes?: string;
  items: PurchaseReturnItemInput[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validatePurchaseReturnInput(input: PurchaseReturnInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.supplier_id) errors.supplier_id = "Supplier wajib dipilih.";
  if (!input.return_date) errors.return_date = "Tanggal retur wajib diisi.";
  else if (!DATE_RE.test(input.return_date)) errors.return_date = "Format tanggal tidak valid (YYYY-MM-DD).";

  if (input.notes && input.notes.trim().length > 500) {
    errors.notes = "Catatan maksimal 500 karakter.";
  }

  if (!input.items || input.items.length === 0) {
    errors.items = "Minimal satu item wajib ditambahkan.";
  } else {
    const seen = new Set<string>();
    for (const item of input.items) {
      if (!item.product_id) {
        errors.items = "Ada item tanpa produk.";
        break;
      }
      if (seen.has(item.product_id)) {
        errors.items = "Produk yang sama tidak boleh muncul dua kali.";
        break;
      }
      seen.add(item.product_id);
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        errors.items = "Qty retur harus lebih dari 0.";
        break;
      }
      if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
        errors.items = "Harga satuan tidak valid.";
        break;
      }
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
