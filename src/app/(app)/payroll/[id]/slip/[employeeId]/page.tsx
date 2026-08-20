import { notFound } from "next/navigation";
import { getPayrollRun, getPayrollDetails } from "@/lib/payroll";
import { getSalaryComponents } from "@/lib/employee";
import { PayslipClient } from "./payslip-client";

export const dynamic = "force-dynamic";

export default async function PayslipPage({
  params,
}: {
  params: Promise<{ id: string; employeeId: string }>;
}) {
  const { id, employeeId } = await params;
  const run = await getPayrollRun(id);
  if (!run) notFound();
  const details = await getPayrollDetails(id);
  const detail = details.find((d) => d.employee_id === employeeId);
  if (!detail) notFound();
  const components = await getSalaryComponents(employeeId);
  return <PayslipClient run={run} detail={detail} components={components} />;
}
