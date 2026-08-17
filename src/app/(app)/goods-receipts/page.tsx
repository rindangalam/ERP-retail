import { GoodsReceiptsClient } from "./goods-receipts-client";
import { listGoodsReceipts } from "@/lib/goods-receipt";

export const dynamic = "force-dynamic";

export default async function GoodsReceiptsPage() {
  const data = await listGoodsReceipts();
  return <GoodsReceiptsClient initialData={data} />;
}
