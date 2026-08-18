"use server";

import { requireRole } from "@/lib/dal";
import { createEmployee, updateEmployee, createSalaryComponent, toggleSalaryComponent, type EmployeeInput, type SCInput } from "@/lib/employee";

const HR_ROLES = ["admin", "hr"];

export async function addEmployee(input: EmployeeInput): Promise<{ ok: boolean; errors: Record<string, string>; id?: string }> {
  const session = await requireRole(HR_ROLES);
  const result = await createEmployee(input, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {}, id: result.data.$id };
}

export async function editEmployee(id: string, input: Partial<EmployeeInput>): Promise<{ ok: boolean; errors: Record<string, string> }> {
  const session = await requireRole(HR_ROLES);
  const result = await updateEmployee(id, input, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {} };
}

export async function addSalaryComponent(employeeId: string, input: SCInput): Promise<{ ok: boolean; errors: Record<string, string> }> {
  const session = await requireRole(HR_ROLES);
  const result = await createSalaryComponent(employeeId, input, session.userId);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {} };
}

export async function toggleSC(id: string): Promise<{ ok: boolean; errors: Record<string, string> }> {
  await requireRole(HR_ROLES);
  const result = await toggleSalaryComponent(id);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, errors: {} };
}
