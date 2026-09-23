import { SalesReturnForm } from "./sales-return-form";
import { listInvoicesForReturn } from "@/lib/sales-return";
import { listVariantsByProductIds, type ProductVariant } from "@/lib/variants";

export const dynamic = "force-dynamic";

export default async function NewSalesReturnPage() {
  const invoices = await listInvoicesForReturn();

  // Pasok varian aktif per produk yang muncul di invoice (pola pos/page.tsx).
  const productIds = [...new Set(invoices.flatMap((inv) => inv.items.map((item) => item.product_id)))];
  let variantsByProduct: Record<string, ProductVariant[]> = {};
  try {
    const grouped = await listVariantsByProductIds(productIds);
    for (const [id, vs] of Object.entries(grouped)) {
      const active = vs.filter((v) => v.is_active);
      if (active.length > 0) variantsByProduct[id] = active;
    }
  } catch {
    variantsByProduct = {};
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Retur Penjualan</h1>
      <SalesReturnForm invoices={invoices} variantsByProduct={variantsByProduct} />
    </div>
  );
}
