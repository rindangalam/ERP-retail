import { EmployeesClient } from "./employees-client";
import { listEmployees } from "@/lib/employee";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const data = await listEmployees();
  return <EmployeesClient initialData={data} />;
}
