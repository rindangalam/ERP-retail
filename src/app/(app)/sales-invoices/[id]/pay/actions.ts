"use server";

import { requireRole } from "@/lib/dal";
import { createSalesPayment, type PaymentInput } from "@/lib/sales-payment";

const ALLOWED_ROLES = ["admin", "sales", "finance"];

export async function recordPayment(
  input: PaymentInput
): Promise<{ ok: boolean; errors: Record<string, string> }> {
  const session = await requireRole(ALLOWED_ROLES);
  const result = await createSalesPayment(input, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {} };
}
