import { notFound } from "next/navigation";
import { getEmployee, getSalaryComponents } from "@/lib/employee";
import { EmployeeDetailClient } from "./employee-detail-client";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) notFound();
  const components = await getSalaryComponents(id);
  return <EmployeeDetailClient employee={employee} components={components} />;
}
