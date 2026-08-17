import { GoodsReceiptForm } from "./goods-receipt-form";
import { listPOsForGR } from "@/lib/goods-receipt";

export const dynamic = "force-dynamic";

export default async function NewGoodsReceiptPage() {
  const pos = await listPOsForGR();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Terima Barang</h1>
      <GoodsReceiptForm pos={pos} />
    </div>
  );
}
