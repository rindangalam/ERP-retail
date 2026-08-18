"use server";

import { requireRole } from "@/lib/dal";
import { generatePayroll, cancelPayrollRun } from "@/lib/payroll";

const HR_ROLES = ["admin", "hr"];

export async function runPayroll(period: string, runDate: string): Promise<{ ok: boolean; id?: string; errors?: Record<string, string> }> {
  const session = await requireRole(HR_ROLES);
  return generatePayroll(period, runDate, session.userId);
}

export async function cancelPR(id: string): Promise<{ ok: boolean; errors?: Record<string, string> }> {
  const session = await requireRole(HR_ROLES);
  return cancelPayrollRun(id, session.userId);
}
