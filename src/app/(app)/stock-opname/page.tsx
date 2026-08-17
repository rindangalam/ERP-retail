import { requireRole } from "@/lib/dal";
import { listOpnames, listOpnameItemsFor } from "@/lib/opname";
import { listProducts } from "@/lib/inventory";
import { StockOpnameClient } from "./stock-opname-client";

export const dynamic = "force-dynamic";

export default async function StockOpnamePage() {
  await requireRole(["admin", "warehouse"]);

  const [opnames, products] = await Promise.all([
    listOpnames(),
    listProducts(),
  ]);

  const items = await listOpnameItemsFor(opnames.map((o) => o.$id));

  return <StockOpnameClient opnames={opnames} items={items} products={products} />;
}
