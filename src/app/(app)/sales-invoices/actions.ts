"use server";

import { requireRole } from "@/lib/dal";
import { createSalesInvoice, postSalesInvoice, cancelSalesInvoice } from "@/lib/sales-invoice";
import type { SalesInvoiceInput } from "@/lib/sales-invoice-validation";

const ALLOWED_ROLES = ["admin", "sales", "finance"];

export async function createInvoice(
  input: SalesInvoiceInput
): Promise<{ ok: boolean; errors: Record<string, string>; id?: string }> {
  const session = await requireRole(ALLOWED_ROLES);

  const result = await createSalesInvoice(input, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {}, id: result.data.$id };
}

export async function postInvoice(
  id: string
): Promise<{ ok: boolean; errors: Record<string, string> }> {
  const session = await requireRole(["admin", "sales"]);

  const result = await postSalesInvoice(id, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {} };
}

export async function cancelInvoice(
  id: string
): Promise<{ ok: boolean; errors: Record<string, string> }> {
  await requireRole(ALLOWED_ROLES);

  const result = await cancelSalesInvoice(id);
  if (!result.ok) {
    if (result.code === "not_draft") return { ok: false, errors: { _form: "Hanya invoice draft yang bisa dibatalkan." } };
    return { ok: false, errors: result.errors };
  }
  return { ok: true, errors: {} };
}
