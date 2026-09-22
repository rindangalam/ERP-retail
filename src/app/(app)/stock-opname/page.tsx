import { requireRole } from "@/lib/dal";
import { listOpnames, listOpnameItemsFor } from "@/lib/opname";
import { listProducts } from "@/lib/inventory";
import { listVariants, type ProductVariant } from "@/lib/variants";
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

  return <StockOpnameClient opnames={opnames} items={items} products={products} variantsByProduct={variantsByProduct} />;
}
