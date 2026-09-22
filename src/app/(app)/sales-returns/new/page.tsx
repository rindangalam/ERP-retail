import { SalesReturnForm } from "./sales-return-form";
import { listInvoicesForReturn } from "@/lib/sales-return";
import { listVariants, type ProductVariant } from "@/lib/variants";

export const dynamic = "force-dynamic";

export default async function NewSalesReturnPage() {
  const invoices = await listInvoicesForReturn();

  // Pasok varian aktif per produk yang muncul di invoice (pola pos/page.tsx).
  const productIds = [...new Set(invoices.flatMap((inv) => inv.items.map((item) => item.product_id)))];
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
      <h1 className="text-2xl font-bold mb-6">Retur Penjualan</h1>
      <SalesReturnForm invoices={invoices} variantsByProduct={variantsByProduct} />
    </div>
  );
}
