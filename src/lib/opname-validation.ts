export type OpnameInput = {
  opname_date: string;
  note?: string;
};

export type OpnameItemInput = {
  product_id: string;
  actual_qty: number;
  note?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateOpnameInput(input: OpnameInput): Record<string, string> | null {
  const errors: Record<string, string> = {};

  if (!DATE_RE.test(input.opname_date)) {
    errors.opname_date = "Tanggal harus berformat YYYY-MM-DD.";
  } else {
    const date = new Date(`${input.opname_date}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      errors.opname_date = "Tanggal tidak valid.";
    }
  }

  if (input.note && input.note.length > 500) {
    errors.note = "Catatan maksimal 500 karakter.";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export function validateOpnameItemInput(input: OpnameItemInput): Record<string, string> | null {
  const errors: Record<string, string> = {};

  if (!input.product_id) {
    errors.product_id = "Produk wajib dipilih.";
  }

  if (!Number.isFinite(input.actual_qty) || input.actual_qty < 0) {
    errors.actual_qty = "Qty aktual harus angka >= 0.";
  }

  if (input.note && input.note.length > 500) {
    errors.note = "Catatan maksimal 500 karakter.";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
