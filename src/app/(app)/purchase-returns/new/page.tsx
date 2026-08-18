import { PurchaseReturnForm } from "./purchase-return-form";
import { listGRsForPR } from "@/lib/purchase-return";

export const dynamic = "force-dynamic";

export default async function NewPurchaseReturnPage() {
  const grs = await listGRsForPR();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Retur Barang</h1>
      <PurchaseReturnForm grs={grs} />
    </div>
  );
}
