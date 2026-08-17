import { requireRole } from "@/lib/dal";
import { listPurchaseOrders } from "@/lib/purchase-order";
import { PurchasingClient } from "./purchasing-client";

export const dynamic = "force-dynamic";

export default async function PurchasingPage() {
  await requireRole(["admin", "purchasing"]);

  const purchaseOrders = await listPurchaseOrders();

  return <PurchasingClient purchaseOrders={purchaseOrders} />;
}
