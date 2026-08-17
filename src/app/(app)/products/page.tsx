import { requireRole } from "@/lib/dal";
import { listCategories, listProducts } from "@/lib/inventory";
import { ProductsClient } from "./products-client";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireRole(["admin", "warehouse"]);

  const [products, categories] = await Promise.all([
    listProducts({ includeInactive: true }),
    listCategories(),
  ]);

  return <ProductsClient products={products} categories={categories} />;
}
