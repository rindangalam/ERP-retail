import { requireRole } from "@/lib/dal";
import { listProducts } from "@/lib/inventory";
import { listSuppliers } from "@/lib/supplier";
import { PurchaseOrderForm } from "./purchase-order-form";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
  await requireRole(["admin", "purchasing"]);

  const [suppliers, products] = await Promise.all([
    listSuppliers({ includeInactive: true }),
    listProducts({ includeInactive: true }),
  ]);

  return <PurchaseOrderForm suppliers={suppliers} products={products} />;
}
