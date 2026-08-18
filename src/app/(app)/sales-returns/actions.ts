"use server";

import { requireRole } from "@/lib/dal";
import { createSalesReturn, cancelSalesReturn, postSalesReturn, type SalesReturnInput } from "@/lib/sales-return";

const ALLOWED_ROLES = ["admin", "sales", "finance"];

export async function createReturn(
  input: SalesReturnInput
): Promise<{ ok: boolean; errors: Record<string, string>; id?: string }> {
  const session = await requireRole(ALLOWED_ROLES);
  const result = await createSalesReturn(input, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {}, id: result.data.$id };
}

export async function cancelReturn(
  id: string
): Promise<{ ok: boolean; errors: Record<string, string> }> {
  await requireRole(ALLOWED_ROLES);
  const result = await cancelSalesReturn(id);
  if (!result.ok) {
    if (result.code === "not_draft") return { ok: false, errors: { _form: "Hanya retur draft yang bisa dibatalkan." } };
    return { ok: false, errors: result.errors };
  }
  return { ok: true, errors: {} };
}

export async function postReturn(
  id: string
): Promise<{ ok: boolean; errors: Record<string, string> }> {
  const session = await requireRole(["admin", "sales"]);
  const result = await postSalesReturn(id, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {} };
}
