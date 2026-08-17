import { requireRole } from "@/lib/dal";
import { listSuppliers } from "@/lib/supplier";
import { SuppliersClient } from "./suppliers-client";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  await requireRole(["admin", "purchasing"]);

  const suppliers = await listSuppliers({ includeInactive: true });

  return <SuppliersClient suppliers={suppliers} />;
}
