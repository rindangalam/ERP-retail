import "server-only";
import { ID, Query } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";

const DATABASE_ID = "erp";
const EMP_COLLECTION = "employees";
const SC_COLLECTION = "salary_components";

type AppwriteDoc = { $id: string; [key: string]: unknown };

export type Employee = AppwriteDoc & {
  employee_number: string;
  user_id: string | null;
  full_name: string;
  position: string;
  basic_salary: number;
  hire_date: string;
  status: "active" | "resigned";
  phone: string | null;
  address: string | null;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
};

export type SalaryComponent = AppwriteDoc & {
  employee_id: string;
  component_type: "allowance" | "deduction";
  name: string;
  amount: number;
  is_active: boolean;
  created_at: string;
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; code?: string };

export async function listEmployees(): Promise<Employee[]> {
  const db = adminDatabases();
  const result = await db.listDocuments(DATABASE_ID, EMP_COLLECTION, [
    Query.orderAsc("employee_number"),
    Query.limit(100),
  ]);
  return result.documents.map((d) => ({ ...d })) as unknown as Employee[];
}

export async function getEmployee(id: string): Promise<Employee | null> {
  try {
    const db = adminDatabases();
    const doc = await db.getDocument(DATABASE_ID, EMP_COLLECTION, id);
    return { ...doc } as unknown as Employee;
  } catch {
    return null;
  }
}

export async function getSalaryComponents(employeeId: string): Promise<SalaryComponent[]> {
  const db = adminDatabases();
  const result = await db.listDocuments(DATABASE_ID, SC_COLLECTION, [
    Query.equal("employee_id", [employeeId]),
    Query.limit(100),
  ]);
  return result.documents.map((d) => ({ ...d })) as unknown as SalaryComponent[];
}

export async function getAllowances(employeeId: string): Promise<number> {
  const components = await getSalaryComponents(employeeId);
  return components
    .filter((c) => c.component_type === "allowance" && c.is_active)
    .reduce((sum, c) => sum + c.amount, 0);
}

export async function getDeductions(employeeId: string): Promise<number> {
  const components = await getSalaryComponents(employeeId);
  return components
    .filter((c) => c.component_type === "deduction" && c.is_active)
    .reduce((sum, c) => sum + c.amount, 0);
}

export type EmployeeInput = {
  employee_number: string;
  full_name: string;
  position: string;
  basic_salary: number;
  hire_date: string;
  phone?: string;
  address?: string;
};

export async function createEmployee(
  input: EmployeeInput,
  userId: string
): Promise<Result<Employee>> {
  if (!input.employee_number?.trim())
    return { ok: false, errors: { employee_number: "Wajib diisi." }, code: "validation" };
  if (!input.full_name?.trim())
    return { ok: false, errors: { full_name: "Wajib diisi." }, code: "validation" };

  try {
    const db = adminDatabases();
    const existing = await db.listDocuments(DATABASE_ID, EMP_COLLECTION, [
      Query.equal("employee_number", [input.employee_number.trim()]),
    ]);
    if (existing.total > 0) {
      return {
        ok: false,
        errors: { employee_number: `Nomor "${input.employee_number}" sudah digunakan.` },
        code: "duplicate",
      };
    }
    const now = new Date().toISOString();
    const doc = await db.createDocument({
      databaseId: DATABASE_ID,
      collectionId: EMP_COLLECTION,
      documentId: ID.unique(),
      data: {
        employee_number: input.employee_number.trim(),
        user_id: null,
        full_name: input.full_name.trim(),
        position: input.position.trim(),
        basic_salary: input.basic_salary,
        hire_date: input.hire_date,
        status: "active",
        phone: input.phone || null,
        address: input.address || null,
        created_by: userId,
        created_at: now,
      },
    });
    return { ok: true, data: { ...doc } as unknown as Employee };
  } catch (error) {
    console.error("createEmployee failed:", error);
    return { ok: false, errors: { _form: "Gagal membuat karyawan." }, code: "create_failed" };
  }
}

export async function updateEmployee(
  id: string,
  input: Partial<EmployeeInput>,
  userId: string
): Promise<Result<Employee>> {
  try {
    const db = adminDatabases();
    const data: Record<string, unknown> = {
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    if (input.employee_number !== undefined) data.employee_number = input.employee_number.trim();
    if (input.full_name !== undefined) data.full_name = input.full_name.trim();
    if (input.position !== undefined) data.position = input.position.trim();
    if (input.basic_salary !== undefined) data.basic_salary = input.basic_salary;
    if (input.hire_date !== undefined) data.hire_date = input.hire_date;
    if (input.phone !== undefined) data.phone = input.phone || null;
    if (input.address !== undefined) data.address = input.address || null;
    const doc = await db.updateDocument({
      databaseId: DATABASE_ID,
      collectionId: EMP_COLLECTION,
      documentId: id,
      data,
    });
    return { ok: true, data: { ...doc } as unknown as Employee };
  } catch (error) {
    console.error("updateEmployee failed:", error);
    return { ok: false, errors: { _form: "Gagal mengupdate karyawan." }, code: "update_failed" };
  }
}

export type SCInput = {
  component_type: "allowance" | "deduction";
  name: string;
  amount: number;
};

export async function createSalaryComponent(
  employeeId: string,
  input: SCInput,
  userId: string
): Promise<Result<SalaryComponent>> {
  if (!input.name?.trim())
    return { ok: false, errors: { name: "Wajib diisi." }, code: "validation" };
  if (!input.amount || input.amount <= 0)
    return { ok: false, errors: { amount: "Harus lebih dari 0." }, code: "validation" };

  try {
    const db = adminDatabases();
    const now = new Date().toISOString();
    const doc = await db.createDocument({
      databaseId: DATABASE_ID,
      collectionId: SC_COLLECTION,
      documentId: ID.unique(),
      data: {
        employee_id: employeeId,
        component_type: input.component_type,
        name: input.name.trim(),
        amount: input.amount,
        is_active: true,
        created_at: now,
      },
    });
    return { ok: true, data: { ...doc } as unknown as SalaryComponent };
  } catch (error) {
    console.error("createSalaryComponent failed:", error);
    return { ok: false, errors: { _form: "Gagal menambah komponen gaji." }, code: "create_failed" };
  }
}

export async function toggleSalaryComponent(id: string): Promise<Result<SalaryComponent>> {
  try {
    const db = adminDatabases();
    const doc = (await db.getDocument(DATABASE_ID, SC_COLLECTION, id)) as unknown as SalaryComponent;
    const updated = await db.updateDocument({
      databaseId: DATABASE_ID,
      collectionId: SC_COLLECTION,
      documentId: id,
      data: { is_active: !doc.is_active },
    });
    return { ok: true, data: { ...updated } as unknown as SalaryComponent };
  } catch (error) {
    console.error("toggleSalaryComponent failed:", error);
    return { ok: false, errors: { _form: "Gagal toggle komponen." }, code: "toggle_failed" };
  }
}
