import { requireRole } from "@/lib/dal";
import { listSalesOrders } from "@/lib/sales-order";
import { SalesOrdersClient } from "./sales-orders-client";

export const dynamic = "force-dynamic";

export default async function SalesOrdersPage() {
  await requireRole(["admin", "sales"]);

  const salesOrders = await listSalesOrders();

  return <SalesOrdersClient salesOrders={salesOrders} />;
}
