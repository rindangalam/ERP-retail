import "server-only";
import { ID, Query } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";
import { listEmployees, getAllowances, getDeductions } from "./employee";

const DATABASE_ID = "erp";
const PR_COLLECTION = "payroll_runs";
const PD_COLLECTION = "payroll_details";

type AppwriteDoc = { $id: string; [key: string]: unknown };

export type PayrollRun = AppwriteDoc & {
  payroll_number: string;
  period: string;
  run_date: string;
  status: "draft" | "posted" | "cancelled";
  total_gross: number;
  total_deduction: number;
  total_net: number;
  created_by: string;
  created_at: string;
  posted_by: string | null;
  posted_at: string | null;
};

export type PayrollDetail = AppwriteDoc & {
  payroll_run_id: string;
  employee_id: string;
  basic_salary: number;
  total_allowance: number;
  total_deduction: number;
  net_salary: number;
};

export type PayrollDetailWithName = PayrollDetail & {
  employee_name?: string;
  employee_number?: string;
};

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  const db = adminDatabases();
  const result = await db.listDocuments(DATABASE_ID, PR_COLLECTION, [
    Query.orderDesc("period"),
    Query.limit(100),
  ]);
  return result.documents.map((d) => ({ ...d })) as unknown as PayrollRun[];
}

export async function getPayrollRun(id: string): Promise<PayrollRun | null> {
  try {
    const db = adminDatabases();
    const doc = await db.getDocument(DATABASE_ID, PR_COLLECTION, id);
    return { ...doc } as unknown as PayrollRun;
  } catch {
    return null;
  }
}

export async function getPayrollDetails(runId: string): Promise<PayrollDetailWithName[]> {
  const db = adminDatabases();
  const result = await db.listDocuments(DATABASE_ID, PD_COLLECTION, [
    Query.equal("payroll_run_id", [runId]),
    Query.limit(100),
  ]);
  const details = result.documents.map((d) => ({ ...d })) as unknown as PayrollDetail[];
  const employees = await listEmployees();
  const empMap = new Map(employees.map((e) => [e.$id, e]));
  return details.map((d) => ({
    ...d,
    employee_name: empMap.get(d.employee_id)?.full_name ?? "Unknown",
    employee_number: empMap.get(d.employee_id)?.employee_number ?? "?",
  }));
}

export async function generatePayroll(period: string, runDate: string, userId: string): Promise<{ ok: boolean; id?: string; errors?: Record<string, string> }> {
  const db = adminDatabases();

  // Check duplicate period
  const existing = await db.listDocuments(DATABASE_ID, PR_COLLECTION, [
    Query.equal("period", [period]),
    Query.limit(10),
  ]);
  const active = (existing.documents as unknown as PayrollRun[]).filter(
    (d) => d.status === "draft" || d.status === "posted"
  );
  if (active.length > 0) {
    return { ok: false, errors: { period: `Periode ${period} sudah memiliki payroll aktif.` } };
  }

  const employees = await listEmployees();
  const activeEmps = employees.filter((e) => e.status === "active");
  if (activeEmps.length === 0) {
    return { ok: false, errors: { _form: "Tidak ada karyawan aktif." } };
  }

  let totalGross = 0;
  let totalDeduction = 0;

  const detailData = [];
  for (const emp of activeEmps) {
    const allowances = await getAllowances(emp.$id);
    const deductions = await getDeductions(emp.$id);
    const gross = emp.basic_salary + allowances;
    const net = gross - deductions;
    totalGross += gross;
    totalDeduction += deductions;
    detailData.push({
      employee_id: emp.$id,
      basic_salary: emp.basic_salary,
      total_allowance: allowances,
      total_deduction: deductions,
      net_salary: net,
    });
  }

  const totalNet = totalGross - totalDeduction;

  // Generate payroll number
  const allPR = await db.listDocuments(DATABASE_ID, PR_COLLECTION, [
    Query.orderDesc("payroll_number"),
    Query.limit(1),
  ]);
  let nextPR = "PR-001";
  if (allPR.documents.length > 0) {
    const m = (allPR.documents[0] as unknown as PayrollRun).payroll_number.match(/PR-(\d+)/);
    if (m) nextPR = `PR-${String(parseInt(m[1], 10) + 1).padStart(3, "0")}`;
  }

  const now = new Date().toISOString();
  const runDoc = await db.createDocument({
    databaseId: DATABASE_ID,
    collectionId: PR_COLLECTION,
    documentId: ID.unique(),
    data: {
      payroll_number: nextPR,
      period,
      run_date: runDate,
      status: "draft",
      total_gross: totalGross,
      total_deduction: totalDeduction,
      total_net: totalNet,
      created_by: userId,
      created_at: now,
    },
  });

  for (const detail of detailData) {
    await db.createDocument({
      databaseId: DATABASE_ID,
      collectionId: PD_COLLECTION,
      documentId: ID.unique(),
      data: {
        payroll_run_id: runDoc.$id,
        employee_id: detail.employee_id,
        basic_salary: detail.basic_salary,
        total_allowance: detail.total_allowance,
        total_deduction: detail.total_deduction,
        net_salary: detail.net_salary,
      },
    });
  }

  return { ok: true, id: runDoc.$id };
}

export async function cancelPayrollRun(id: string, userId: string): Promise<{ ok: boolean; errors?: Record<string, string> }> {
  try {
    const db = adminDatabases();
    await db.updateDocument({
      databaseId: DATABASE_ID,
      collectionId: PR_COLLECTION,
      documentId: id,
      data: { status: "cancelled" },
    });
    return { ok: true };
  } catch (error) {
    console.error("cancelPayrollRun failed:", error);
    return { ok: false, errors: { _form: "Gagal membatalkan payroll." } };
  }
}
