import { requireRole } from "@/lib/dal";
import { listCategories, listProducts } from "@/lib/inventory";
import { listVariants, type ProductVariant } from "@/lib/variants";
import { ProductsClient } from "./products-client";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireRole(["admin", "warehouse"]);

  const [products, categories] = await Promise.all([
    listProducts({ includeInactive: true }),
    listCategories(),
  ]);

  const variantEntries = await Promise.all(
    products.map(async (p) => {
      try {
        const vs = await listVariants(p.$id);
        return [p.$id, vs] as [string, ProductVariant[]];
      } catch {
        return [p.$id, []] as [string, ProductVariant[]];
      }
    })
  );
  const variantsByProduct: Record<string, ProductVariant[]> = {};
  for (const [id, vs] of variantEntries) {
    if (vs.length > 0) variantsByProduct[id] = vs;
  }

  return <ProductsClient products={products} categories={categories} variantsByProduct={variantsByProduct} />;
}
