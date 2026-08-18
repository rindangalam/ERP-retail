"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { recordPayment } from "./actions";
import type { PaymentMethod } from "@/lib/sales-payment";

type InvoiceInfo = {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  customer_name: string;
};

type ExistingPayment = {
  $id: string;
  payment_date: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  created_by: string;
};

type Props = {
  invoice: InvoiceInfo;
  existingPayments: ExistingPayment[];
  summary: { total_paid: number; remaining: number };
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Tunai",
  bank_transfer: "Transfer Bank",
  other: "Lainnya",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  unpaid: "Belum Dibayar",
  partial: "Bayar Sebagian",
  paid: "Dibayar",
  cancelled: "Dibatalkan",
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) => {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
};

export function PaymentForm({ invoice, existingPayments, summary }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [paymentDate, setPaymentDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = React.useState(String(summary.remaining));
  const [method, setMethod] = React.useState<PaymentMethod>("cash");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const isPayable = invoice.status === "unpaid" || invoice.status === "partial";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const numAmount = parseFloat(amount);
    const result = await recordPayment({
      invoice_id: invoice.id,
      payment_date: paymentDate,
      amount: numAmount,
      method,
      reference: reference || undefined,
      notes: notes || undefined,
    });

    if (!result.ok) {
      setErrors(result.errors);
      setLoading(false);
      return;
    }

    router.push("/sales-invoices");
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-md border p-4 space-y-3">
        <h2 className="font-semibold">Invoice</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Nomor</dt>
          <dd className="font-mono">{invoice.invoice_number}</dd>
          <dt className="text-muted-foreground">Customer</dt>
          <dd>{invoice.customer_name}</dd>
          <dt className="text-muted-foreground">Total</dt>
          <dd>{fmtCurrency(invoice.total_amount)}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd><Badge>{STATUS_LABEL[invoice.status] ?? invoice.status}</Badge></dd>
          <dt className="text-muted-foreground">Sudah Dibayar</dt>
          <dd>{fmtCurrency(summary.total_paid)}</dd>
          <dt className="text-muted-foreground">Sisa Tagihan</dt>
          <dd className="font-semibold">{fmtCurrency(summary.remaining)}</dd>
        </dl>
      </div>

      {isPayable ? (
        <form onSubmit={handleSubmit} className="rounded-md border p-4 space-y-4">
          <h2 className="font-semibold">Catat Pembayaran</h2>

          {errors._form && <p className="text-sm text-red-600">{errors._form}</p>}

          <div className="space-y-1">
            <label htmlFor="payment_date" className="text-sm font-medium">Tanggal Bayar</label>
            <input
              id="payment_date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            />
            {errors.payment_date && <p className="text-xs text-red-600">{errors.payment_date}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="amount" className="text-sm font-medium">Jumlah (Rp)</label>
            <input
              id="amount"
              type="number"
              min="1"
              max={summary.remaining}
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            />
            {errors.amount && <p className="text-xs text-red-600">{errors.amount}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="method" className="text-sm font-medium">Metode</label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="cash">Tunai</option>
              <option value="bank_transfer">Transfer Bank</option>
              <option value="other">Lainnya</option>
            </select>
            {errors.method && <p className="text-xs text-red-600">{errors.method}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="reference" className="text-sm font-medium">No. Referensi</label>
            <input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Opsional"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="notes" className="text-sm font-medium">Catatan</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={2}
              placeholder="Opsional"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Bayar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/sales-invoices")}>
              Batal
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-md border p-4 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Invoice dengan status &quot;{STATUS_LABEL[invoice.status]}&quot; tidak bisa dibayar.
          </p>
        </div>
      )}

      {existingPayments.length > 0 && (
        <div className="lg:col-span-2 rounded-md border p-4 space-y-3">
          <h2 className="font-semibold">Riwayat Pembayaran</h2>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">Tanggal</th>
                  <th className="px-3 py-2 text-right font-medium">Jumlah</th>
                  <th className="px-3 py-2 text-left font-medium">Metode</th>
                  <th className="px-3 py-2 text-left font-medium">Referensi</th>
                  <th className="px-3 py-2 text-left font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {existingPayments.map((p) => (
                  <tr key={p.$id} className="border-b last:border-0">
                    <td className="px-3 py-2">{fmtDate(p.payment_date)}</td>
                    <td className="px-3 py-2 text-right">{fmtCurrency(p.amount)}</td>
                    <td className="px-3 py-2">{METHOD_LABEL[p.method]}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.reference ?? "—"}</td>
                    <td className="px-3 py-2">{p.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">{fmtCurrency(summary.total_paid)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
