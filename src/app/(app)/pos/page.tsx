import { requireRole } from "@/lib/dal";
import { listProducts } from "@/lib/inventory";
import { listVariants, type ProductVariant } from "@/lib/variants";
import { PosClient } from "./pos-client";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  await requireRole(["admin", "sales"]);

  const products = await listProducts();

  const variantEntries = await Promise.all(
    products.map(async (p) => {
      try {
        const vs = (await listVariants(p.$id)).filter((v) => v.is_active);
        return [p.$id, vs] as [string, ProductVariant[]];
      } catch {
        return [p.$id, []] as [string, ProductVariant[]];
      }
    }),
  );
  const variantsByProduct: Record<string, ProductVariant[]> = {};
  for (const [id, vs] of variantEntries) {
    if (vs.length > 0) variantsByProduct[id] = vs;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kasir</h1>
        <p className="text-sm text-muted-foreground">
          Penjualan cepat butik tanpa sales order — invoice langsung posting dan lunas.
        </p>
      </div>
      <PosClient products={products} variantsByProduct={variantsByProduct} />
    </div>
  );
}
