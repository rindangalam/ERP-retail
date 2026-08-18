"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { createCustomer, setCustomerActive, updateCustomer } from "@/lib/customer";

export type CustomerActionState =
  | { ok: boolean; errors?: Record<string, string>; message?: string }
  | undefined;

const ALLOWED_ROLES = ["admin", "sales"];

export async function createCustomerAction(
  prevState: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const session = await requireRole(ALLOWED_ROLES);

  const creditLimitRaw = formData.get("credit_limit");
  const creditLimit = creditLimitRaw && creditLimitRaw !== "" ? Number(creditLimitRaw) : undefined;

  const result = await createCustomer(
    {
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      contact_person: String(formData.get("contact_person") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      address: String(formData.get("address") ?? ""),
      credit_limit: creditLimit,
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath("/customers");
    return { ok: true, message: "Customer berhasil dibuat." };
  }

  const hasFieldErrors = Object.keys(result.errors).length > 0;
  return {
    ok: false,
    errors: result.errors,
    message: hasFieldErrors ? undefined : "Gagal menyimpan customer.",
  };
}

export async function updateCustomerAction(
  prevState: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");

  const creditLimitRaw = formData.get("credit_limit");
  const creditLimit = creditLimitRaw && creditLimitRaw !== "" ? Number(creditLimitRaw) : undefined;

  const result = await updateCustomer(
    id,
    {
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      contact_person: String(formData.get("contact_person") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      address: String(formData.get("address") ?? ""),
      credit_limit: creditLimit,
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath("/customers");
    return { ok: true, message: "Customer diperbarui." };
  }

  const hasFieldErrors = Object.keys(result.errors).length > 0;
  return {
    ok: false,
    errors: result.errors,
    message: hasFieldErrors ? undefined : "Gagal memperbarui customer.",
  };
}

export async function toggleCustomerActiveAction(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";

  await setCustomerActive(id, isActive, session.userId);
  revalidatePath("/customers");
}
