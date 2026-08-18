import { requireRole } from "@/lib/dal";
import { listSalesInvoices } from "@/lib/sales-invoice";
import SalesInvoicesClient from "./sales-invoices-client";

export const dynamic = "force-dynamic";

export default async function SalesInvoicesPage() {
  await requireRole(["admin", "sales", "finance"]);

  const invoices = await listSalesInvoices();

  return <SalesInvoicesClient invoices={invoices} />;
}
