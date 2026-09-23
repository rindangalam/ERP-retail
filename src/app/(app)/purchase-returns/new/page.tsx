import { PurchaseReturnForm } from "./purchase-return-form";
import { listGRsForPR } from "@/lib/purchase-return";
import { listVariantsByProductIds, type ProductVariant } from "@/lib/variants";

export const dynamic = "force-dynamic";

export default async function NewPurchaseReturnPage() {
  const grs = await listGRsForPR();

  // Pasok varian aktif per produk yang muncul di GR (pola pos/page.tsx).
  const productIds = [...new Set(grs.flatMap((gr) => gr.items.map((item) => item.product_id)))];
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
      <h1 className="text-2xl font-bold mb-6">Retur Barang</h1>
      <PurchaseReturnForm grs={grs} variantsByProduct={variantsByProduct} />
    </div>
  );
}
