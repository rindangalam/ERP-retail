"use server";

import { requireRole } from "@/lib/dal";
import { createCOA, updateCOA, toggleCOAActive, type COAInput } from "@/lib/coa";

const ALLOWED_ROLES = ["admin", "finance"];

export async function createAccount(
  input: COAInput
): Promise<{ ok: boolean; errors: Record<string, string>; id?: string }> {
  const session = await requireRole(ALLOWED_ROLES);
  const result = await createCOA(input, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {}, id: result.data.$id };
}

export async function updateAccount(
  id: string, input: Partial<COAInput>
): Promise<{ ok: boolean; errors: Record<string, string> }> {
  const session = await requireRole(ALLOWED_ROLES);
  const result = await updateCOA(id, input, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {} };
}

export async function toggleAccount(
  id: string
): Promise<{ ok: boolean; errors: Record<string, string> }> {
  const session = await requireRole(ALLOWED_ROLES);
  const result = await toggleCOAActive(id, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {} };
}
