"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { createSupplier, setSupplierActive, updateSupplier } from "@/lib/supplier";

export type SupplierActionState =
  | { ok: boolean; errors?: Record<string, string>; message?: string }
  | undefined;

const ALLOWED_ROLES = ["admin", "purchasing"];

export async function createSupplierAction(
  prevState: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  const session = await requireRole(ALLOWED_ROLES);

  const result = await createSupplier(
    {
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      contact_person: String(formData.get("contact_person") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      address: String(formData.get("address") ?? ""),
      payment_terms: String(formData.get("payment_terms") ?? ""),
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath("/suppliers");
    return { ok: true, message: "Supplier berhasil dibuat." };
  }

  const hasFieldErrors = Object.keys(result.errors).length > 0;
  return {
    ok: false,
    errors: result.errors,
    message: hasFieldErrors ? undefined : "Gagal menyimpan supplier.",
  };
}

export async function updateSupplierAction(
  prevState: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");

  const result = await updateSupplier(
    id,
    {
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      contact_person: String(formData.get("contact_person") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      address: String(formData.get("address") ?? ""),
      payment_terms: String(formData.get("payment_terms") ?? ""),
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath("/suppliers");
    return { ok: true, message: "Supplier diperbarui." };
  }

  const hasFieldErrors = Object.keys(result.errors).length > 0;
  return {
    ok: false,
    errors: result.errors,
    message: hasFieldErrors ? undefined : "Gagal memperbarui supplier.",
  };
}

export async function toggleSupplierActiveAction(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";

  await setSupplierActive(id, isActive, session.userId);
  revalidatePath("/suppliers");
}
