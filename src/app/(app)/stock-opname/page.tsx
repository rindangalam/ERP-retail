import { requireRole } from "@/lib/dal";
import { listOpnames, listOpnameItemsFor } from "@/lib/opname";
import { listProducts } from "@/lib/inventory";
import { listVariantsByProductIds, type ProductVariant } from "@/lib/variants";
import { StockOpnameClient } from "./stock-opname-client";

export const dynamic = "force-dynamic";

export default async function StockOpnamePage() {
  await requireRole(["admin", "warehouse"]);

  const [opnames, products] = await Promise.all([
    listOpnames(),
    listProducts(),
  ]);

  const items = await listOpnameItemsFor(opnames.map((o) => o.$id));

  // Pasok varian aktif per produk untuk opname level-varian (pola pos/page.tsx).
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

  return <StockOpnameClient opnames={opnames} items={items} products={products} variantsByProduct={variantsByProduct} />;
}
