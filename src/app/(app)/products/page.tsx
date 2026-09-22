import { requireRole } from "@/lib/dal";
import { listCategories, listProducts } from "@/lib/inventory";
import { listVariantsByProductIds, type ProductVariant } from "@/lib/variants";
import { ProductsClient } from "./products-client";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireRole(["admin", "warehouse"]);

  const [products, categories] = await Promise.all([
    listProducts({ includeInactive: true }),
    listCategories(),
  ]);

  let variantsByProduct: Record<string, ProductVariant[]> = {};
  try {
    variantsByProduct = await listVariantsByProductIds(products.map((p) => p.$id));
  } catch {
    variantsByProduct = {};
  }

  return <ProductsClient products={products} categories={categories} variantsByProduct={variantsByProduct} />;
}
