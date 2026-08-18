import { notFound } from "next/navigation";
import { getPayrollRun, getPayrollDetails } from "@/lib/payroll";
import { PayrollDetailClient } from "./payroll-detail-client";

export const dynamic = "force-dynamic";

export default async function PayrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getPayrollRun(id);
  if (!run) notFound();
  const details = await getPayrollDetails(id);
  return <PayrollDetailClient run={run} details={details} />;
}
