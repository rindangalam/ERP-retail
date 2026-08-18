"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SalesReturnWithItems, SalesReturnStatus } from "@/lib/sales-return";
import { cancelReturn, postReturn } from "./actions";

type Props = { initialData: SalesReturnWithItems[] };

const STATUS_LABEL: Record<SalesReturnStatus, string> = {
  draft: "Draft", posted: "Diposting", cancelled: "Dibatalkan",
};

const STATUS_VARIANT: Record<SalesReturnStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline", posted: "default", cancelled: "destructive",
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
};

export function SalesReturnsClient({ initialData }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);

  const handleCancel = async (id: string) => {
    if (!window.confirm("Batalkan retur ini?")) return;
    setLoading(id);
    const result = await cancelReturn(id);
    if (!result.ok) alert(result.errors._form ?? "Gagal membatalkan retur.");
    setLoading(null);
    router.refresh();
  };

  const handlePost = async (id: string) => {
    setLoading(id);
    const result = await postReturn(id);
    if (!result.ok) alert(result.errors._form ?? "Gagal memposting retur.");
    setLoading(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sales Returns</h1>
        <Button asChild size="sm">
          <a href="/sales-returns/new">+ Buat Retur</a>
        </Button>
      </div>
      {initialData.length === 0 ? (
        <p className="text-muted-foreground text-sm">Belum ada retur.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Nomor</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Total Retur</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.map((sr) => (
                <TableRow key={sr.$id}>
                  <TableCell className="font-mono text-xs">{sr.return_number}</TableCell>
                  <TableCell className="font-mono text-xs">{sr.invoice_number}</TableCell>
                  <TableCell>{sr.customer_name}</TableCell>
                  <TableCell className="text-xs">{fmtDate(sr.return_date)}</TableCell>
                  <TableCell className="text-right text-xs">{fmtCurrency(sr.total_returned)}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[sr.status]}>{STATUS_LABEL[sr.status]}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    {sr.status === "draft" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handlePost(sr.$id)} disabled={loading === sr.$id}>
                          {loading === sr.$id ? "Posting..." : "Posting"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(sr.$id)} disabled={loading === sr.$id}>
                          Batalkan
                        </Button>
                      </>
                    )}
                    {sr.status !== "draft" && <span className="text-muted-foreground text-xs">—</span>}
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
