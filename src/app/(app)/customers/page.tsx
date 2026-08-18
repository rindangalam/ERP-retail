import { requireRole } from "@/lib/dal";
import { listCustomers } from "@/lib/customer";
import { CustomersClient } from "./customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  await requireRole(["admin", "sales"]);

  const customers = await listCustomers({ includeInactive: true });

  return <CustomersClient customers={customers} />;
}
