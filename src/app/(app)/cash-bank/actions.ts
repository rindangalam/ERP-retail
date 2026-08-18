"use server";

import { requireRole } from "@/lib/dal";
import {
  createCashBankAccount, updateCashBankAccount, createTransaction,
  type CBAInput, type CBTInput,
} from "@/lib/cash-bank";

const ALLOWED_ROLES = ["admin", "finance"];

export async function createAccount(
  input: CBAInput
): Promise<{ ok: boolean; errors: Record<string, string>; id?: string }> {
  const session = await requireRole(ALLOWED_ROLES);
  const result = await createCashBankAccount(input, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {}, id: result.data.$id };
}

export async function updateAccount(
  id: string, input: Partial<CBAInput>
): Promise<{ ok: boolean; errors: Record<string, string> }> {
  const session = await requireRole(ALLOWED_ROLES);
  const result = await updateCashBankAccount(id, input, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {} };
}

export async function addTransaction(
  input: CBTInput
): Promise<{ ok: boolean; errors: Record<string, string>; id?: string }> {
  const session = await requireRole(ALLOWED_ROLES);
  const result = await createTransaction(input, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {}, id: result.data.$id };
}
