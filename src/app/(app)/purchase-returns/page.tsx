import { PurchaseReturnsClient } from "./purchase-returns-client";
import { listPurchaseReturns } from "@/lib/purchase-return";

export const dynamic = "force-dynamic";

export default async function PurchaseReturnsPage() {
  const data = await listPurchaseReturns();
  return <PurchaseReturnsClient initialData={data} />;
}
