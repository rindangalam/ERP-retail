import { SalesReturnForm } from "./sales-return-form";
import { listInvoicesForReturn } from "@/lib/sales-return";

export const dynamic = "force-dynamic";

export default async function NewSalesReturnPage() {
  const invoices = await listInvoicesForReturn();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Retur Penjualan</h1>
      <SalesReturnForm invoices={invoices} />
    </div>
  );
}
