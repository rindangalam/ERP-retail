export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

export type CustomerInput = {
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit?: number;
};

export function normalizeCustomerCode(code: string): string {
  return code.trim().toUpperCase();
}

export function validateCustomerInput(input: CustomerInput): ValidationResult {
  const errors: Record<string, string> = {};

  const code = normalizeCustomerCode(input.code);
  if (!code) errors.code = "Kode customer wajib diisi.";
  else if (code.length > 50) errors.code = "Kode customer maksimal 50 karakter.";

  if (!input.name?.trim()) errors.name = "Nama customer wajib diisi.";
  else if (input.name.trim().length > 255) errors.name = "Nama customer maksimal 255 karakter.";

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

  if (input.credit_limit !== undefined && input.credit_limit !== null) {
    if (!Number.isFinite(input.credit_limit) || input.credit_limit < 0) {
      errors.credit_limit = "Batas kredit harus >= 0.";
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
