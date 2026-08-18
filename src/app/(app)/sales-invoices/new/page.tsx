import { requireRole } from "@/lib/dal";
import { listConfirmedSOs } from "@/lib/sales-invoice";
import SalesInvoiceForm from "./sales-invoice-form";

export const dynamic = "force-dynamic";

export default async function NewSalesInvoicePage() {
  await requireRole(["admin", "sales"]);

  const confirmedSOs = await listConfirmedSOs();

  return <SalesInvoiceForm confirmedSOs={confirmedSOs} />;
}
