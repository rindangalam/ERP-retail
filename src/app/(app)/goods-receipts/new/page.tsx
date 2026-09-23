import { GoodsReceiptForm } from "./goods-receipt-form";
import { listPOsForGR } from "@/lib/goods-receipt";
import { listVariantsByProductIds, type ProductVariant } from "@/lib/variants";

export const dynamic = "force-dynamic";

export default async function NewGoodsReceiptPage() {
  const pos = await listPOsForGR();

  // Pasok varian aktif per produk yang muncul di PO (pola pos/page.tsx).
  const productIds = [...new Set(pos.flatMap((po) => po.items.map((item) => item.product_id)))];
  let variantsByProduct: Record<string, ProductVariant[]> = {};
  try {
    const grouped = await listVariantsByProductIds(productIds);
    for (const [id, vs] of Object.entries(grouped)) {
      const active = vs.filter((v) => v.is_active);
      if (active.length > 0) variantsByProduct[id] = active;
    }
  } catch {
    variantsByProduct = {};
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Terima Barang</h1>
      <GoodsReceiptForm pos={pos} variantsByProduct={variantsByProduct} />
    </div>
  );
}
