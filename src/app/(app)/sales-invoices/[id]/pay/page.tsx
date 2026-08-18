import { notFound } from "next/navigation";
import { getSalesInvoice } from "@/lib/sales-invoice";
import { listPaymentsByInvoice, getPaymentSummary } from "@/lib/sales-payment";
import { PaymentForm } from "./payment-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PayInvoicePage({ params }: Props) {
  const { id } = await params;
  const invoice = await getSalesInvoice(id);
  if (!invoice) notFound();

  const payments = await listPaymentsByInvoice(id);
  const summary = await getPaymentSummary(id);
  const remaining = invoice.total_amount - summary.total_paid;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pembayaran Invoice</h1>
      <PaymentForm
        invoice={{
          id: invoice.$id,
          invoice_number: invoice.invoice_number,
          total_amount: invoice.total_amount,
          status: invoice.status,
          customer_name: invoice.customer_name,
        }}
        existingPayments={payments.map((p) => ({
          $id: p.$id,
          payment_date: p.payment_date,
          amount: p.amount,
          method: p.method,
          reference: p.reference,
          notes: p.notes,
          created_by: p.created_by,
        }))}
        summary={{ total_paid: summary.total_paid, remaining }}
      />
    </div>
  );
}
