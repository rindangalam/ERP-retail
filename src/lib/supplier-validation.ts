export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

export type SupplierInput = {
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms?: string;
};

export function normalizeSupplierCode(code: string): string {
  return code.trim().toUpperCase();
}

export function validateSupplierInput(input: SupplierInput): ValidationResult {
  const errors: Record<string, string> = {};

  const code = normalizeSupplierCode(input.code);
  if (!code) errors.code = "Kode supplier wajib diisi.";
  else if (code.length > 50) errors.code = "Kode supplier maksimal 50 karakter.";

  if (!input.name?.trim()) errors.name = "Nama supplier wajib diisi.";
  else if (input.name.trim().length > 255) errors.name = "Nama supplier maksimal 255 karakter.";

  if (input.contact_person && input.contact_person.trim().length > 255) {
    errors.contact_person = "Nama kontak maksimal 255 karakter.";
  }

  if (input.phone && input.phone.trim().length > 50) {
    errors.phone = "Nomor telepon maksimal 50 karakter.";
  }

  if (input.email && input.email.trim().length > 255) {
    errors.email = "Email maksimal 255 karakter.";
  } else if (input.email?.trim()) {
    const email = input.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Format email tidak valid.";
    }
  }

  if (input.address && input.address.trim().length > 500) {
    errors.address = "Alamat maksimal 500 karakter.";
  }

  if (input.payment_terms && input.payment_terms.trim().length > 50) {
    errors.payment_terms = "Termin pembayaran maksimal 50 karakter.";
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
