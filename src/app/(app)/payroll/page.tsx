import { PayrollClient } from "./payroll-client";
import { listPayrollRuns } from "@/lib/payroll";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const data = await listPayrollRuns();
  return <PayrollClient initialData={data} />;
}
