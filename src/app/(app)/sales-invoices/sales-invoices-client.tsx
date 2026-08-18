"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SalesInvoiceWithItems, SalesInvoiceStatus } from "@/lib/sales-invoice";
import { postInvoice, cancelInvoice } from "./actions";

type Props = {
  invoices: SalesInvoiceWithItems[];
};

const STATUS_LABEL: Record<SalesInvoiceStatus, string> = {
  draft: "Draft",
  unpaid: "Belum Dibayar",
  partial: "Bayar Sebagian",
  paid: "Dibayar",
  cancelled: "Dibatalkan",
};

const STATUS_VARIANT: Record<SalesInvoiceStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  unpaid: "destructive",
  partial: "secondary",
  paid: "default",
  cancelled: "destructive",
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

export default function SalesInvoicesClient({ invoices }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);

  const handlePost = async (id: string) => {
    setLoading(id);
    const result = await postInvoice(id);
    if (!result.ok) {
      alert(result.errors._form ?? "Gagal mem-posting invoice.");
    }
    setLoading(null);
    router.refresh();
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("Batalkan invoice ini?")) return;
    setLoading(id);
    const result = await cancelInvoice(id);
    if (!result.ok) {
      alert(result.errors._form ?? "Gagal membatalkan invoice.");
    }
    setLoading(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sales Invoices</h1>
        <Button asChild size="sm">
          <a href="/sales-invoices/new">+ Buat Invoice</a>
        </Button>
      </div>

      {invoices.length === 0 ? (
        <p className="text-muted-foreground text-sm">Belum ada invoice.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Nomor</TableHead>
                <TableHead>SO</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[180px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.$id}>
                  <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                  <TableCell className="font-mono text-xs">{inv.so_number}</TableCell>
                  <TableCell>{inv.customer_name}</TableCell>
                  <TableCell className="text-xs">{fmtDate(inv.invoice_date)}</TableCell>
                  <TableCell className="text-xs">{fmtDate(inv.due_date)}</TableCell>
                  <TableCell className="text-right text-xs">{fmtCurrency(inv.total_amount)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {(inv.status === "unpaid" || inv.status === "partial") && (
                      <Button size="sm" variant="default" asChild>
                        <a href={`/sales-invoices/${inv.$id}/pay`}>Bayar</a>
                      </Button>
                    )}
                    {inv.status === "draft" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePost(inv.$id)}
                          disabled={loading === inv.$id}
                        >
                          {loading === inv.$id ? "Posting..." : "Posting"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancel(inv.$id)}
                          disabled={loading === inv.$id}
                        >
                          Batalkan
                        </Button>
                      </>
                    )}
                    {inv.status !== "draft" && (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
