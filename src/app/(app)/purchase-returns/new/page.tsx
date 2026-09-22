import { PurchaseReturnForm } from "./purchase-return-form";
import { listGRsForPR } from "@/lib/purchase-return";
import { listVariants, type ProductVariant } from "@/lib/variants";

export const dynamic = "force-dynamic";

export default async function NewPurchaseReturnPage() {
  const grs = await listGRsForPR();

  // Pasok varian aktif per produk yang muncul di GR (pola pos/page.tsx).
  const productIds = [...new Set(grs.flatMap((gr) => gr.items.map((item) => item.product_id)))];
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
      <h1 className="text-2xl font-bold mb-6">Retur Barang</h1>
      <PurchaseReturnForm grs={grs} variantsByProduct={variantsByProduct} />
    </div>
  );
}
