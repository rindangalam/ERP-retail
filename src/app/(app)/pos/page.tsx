import { requireRole } from "@/lib/dal";
import { listProducts } from "@/lib/inventory";
import { listVariantsByProductIds, type ProductVariant } from "@/lib/variants";
import { PosClient } from "./pos-client";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  await requireRole(["admin", "sales"]);

  const products = await listProducts();

  let variantsByProduct: Record<string, ProductVariant[]> = {};
  try {
    const grouped = await listVariantsByProductIds(products.map((p) => p.$id));
    for (const [id, vs] of Object.entries(grouped)) {
      const active = vs.filter((v) => v.is_active);
      if (active.length > 0) variantsByProduct[id] = active;
    }
  } catch {
    variantsByProduct = {};
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
