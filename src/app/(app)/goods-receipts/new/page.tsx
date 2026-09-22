import { GoodsReceiptForm } from "./goods-receipt-form";
import { listPOsForGR } from "@/lib/goods-receipt";
import { listVariants, type ProductVariant } from "@/lib/variants";

export const dynamic = "force-dynamic";

export default async function NewGoodsReceiptPage() {
  const pos = await listPOsForGR();

  // Pasok varian aktif per produk yang muncul di PO (pola pos/page.tsx).
  const productIds = [...new Set(pos.flatMap((po) => po.items.map((item) => item.product_id)))];
  const variantEntries = await Promise.all(
    productIds.map(async (id) => {
      try {
        const vs = (await listVariants(id)).filter((v) => v.is_active);
        return [id, vs] as [string, ProductVariant[]];
      } catch {
        return [id, []] as [string, ProductVariant[]];
      }
    }),
  );
  const variantsByProduct: Record<string, ProductVariant[]> = {};
  for (const [id, vs] of variantEntries) {
    if (vs.length > 0) variantsByProduct[id] = vs;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Terima Barang</h1>
      <GoodsReceiptForm pos={pos} variantsByProduct={variantsByProduct} />
    </div>
  );
}
