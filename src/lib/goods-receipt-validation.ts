export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

export type GoodsReceiptItemInput = {
  purchase_order_item_id: string;
  product_id: string;
  quantity_received: number;
};

export type GoodsReceiptInput = {
  purchase_order_id: string;
  received_date: string;
  notes?: string;
  items: GoodsReceiptItemInput[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateGoodsReceiptInput(input: GoodsReceiptInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.purchase_order_id) errors.purchase_order_id = "Purchase Order wajib dipilih.";

  if (!input.received_date) errors.received_date = "Tanggal penerimaan wajib diisi.";
  else if (!DATE_RE.test(input.received_date)) errors.received_date = "Format tanggal tidak valid (YYYY-MM-DD).";

  if (input.notes && input.notes.trim().length > 500) {
    errors.notes = "Catatan maksimal 500 karakter.";
  }

  if (!input.items || input.items.length === 0) {
    errors.items = "Minimal satu item wajib ditambahkan.";
  } else {
    const seen = new Set<string>();
    for (const item of input.items) {
      if (!item.purchase_order_item_id) {
        errors.items = "Ada item tanpa PO item. Hapus atau lengkapi.";
        break;
      }
      if (seen.has(item.purchase_order_item_id)) {
        errors.items = "Item PO yang sama tidak boleh muncul dua kali.";
        break;
      }
      seen.add(item.purchase_order_item_id);
      if (!Number.isFinite(item.quantity_received) || item.quantity_received <= 0) {
        errors.items = "Qty diterima harus lebih dari 0.";
        break;
      }
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
