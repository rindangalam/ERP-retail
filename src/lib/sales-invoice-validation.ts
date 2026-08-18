export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

export type SalesInvoiceItemInput = {
  sales_order_item_id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
};

export type SalesInvoiceInput = {
  sales_order_id: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  discount?: number;
  tax?: number;
  notes?: string;
  stock_override?: boolean;
  override_note?: string;
  items: SalesInvoiceItemInput[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateSalesInvoiceInput(input: SalesInvoiceInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.sales_order_id) errors.sales_order_id = "Sales Order wajib dipilih.";
  if (!input.customer_id) errors.customer_id = "Customer wajib dipilih.";

  if (!input.invoice_date) errors.invoice_date = "Tanggal invoice wajib diisi.";
  else if (!DATE_RE.test(input.invoice_date)) errors.invoice_date = "Format tanggal tidak valid (YYYY-MM-DD).";

  if (!input.due_date) errors.due_date = "Tanggal jatuh tempo wajib diisi.";
  else if (!DATE_RE.test(input.due_date)) errors.due_date = "Format tanggal tidak valid (YYYY-MM-DD).";

  if (input.discount !== undefined && input.discount !== null) {
    if (!Number.isFinite(input.discount) || input.discount < 0) {
      errors.discount = "Diskon harus >= 0.";
    }
  }

  if (input.tax !== undefined && input.tax !== null) {
    if (!Number.isFinite(input.tax) || input.tax < 0) {
      errors.tax = "Pajak harus >= 0.";
    }
  }

  if (input.stock_override && !input.override_note?.trim()) {
    errors.override_note = "Alasan override wajib diisi jika override stok.";
  }

  if (!input.items || input.items.length === 0) {
    errors.items = "Minimal satu item produk wajib ditambahkan.";
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
        errors.items = "Quantity harus lebih dari 0.";
        break;
      }
      if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
        errors.items = "Harga satuan harus >= 0.";
        break;
      }
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
