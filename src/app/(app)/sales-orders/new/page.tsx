import { requireRole } from "@/lib/dal";
import { listCustomers } from "@/lib/customer";
import { listProducts } from "@/lib/inventory";
import { SalesOrderForm } from "./sales-order-form";

export const dynamic = "force-dynamic";

export default async function NewSalesOrderPage() {
  await requireRole(["admin", "sales"]);

  const [customers, products] = await Promise.all([
    listCustomers({ includeInactive: true }),
    listProducts({ includeInactive: true }),
  ]);

  return <SalesOrderForm customers={customers} products={products} />;
}
