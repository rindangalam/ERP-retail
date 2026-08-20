"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SalesOrderWithItems } from "@/lib/sales-order";
import { cancelSalesOrderAction, confirmSalesOrderAction } from "./actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type SalesOrdersClientProps = {
  salesOrders: SalesOrderWithItems[];
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

const STATUS_STYLES: Record<string, string> = {
  draft: "",
  confirmed: "text-blue-600",
  partially_invoiced: "text-amber-600",
  invoiced: "text-positive",
  cancelled: "text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  confirmed: "Dikonfirmasi",
  partially_invoiced: "Sebagian",
  invoiced: "Difakturkan",
  cancelled: "Batal",
};

export function SalesOrdersClient({ salesOrders }: SalesOrdersClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function handleConfirm(soId: string) {
    setProcessingId(soId);
    setError(null);
    const form = new FormData();
    form.set("id", soId);
    const result = await confirmSalesOrderAction(form);
    if (result.error) {
      setError(result.error);
      setProcessingId(null);
      return;
    }
    startTransition(() => router.refresh());
    setProcessingId(null);
  }

  async function handleCancel(soId: string) {
    setProcessingId(soId);
    setError(null);
    const form = new FormData();
    form.set("id", soId);
    const result = await cancelSalesOrderAction(form);
    if (result.error) {
      setError(result.error);
      setProcessingId(null);
      return;
    }
    startTransition(() => router.refresh());
    setProcessingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Sales Order</h1>
          <p className="text-xs text-muted-foreground">
            Order penjualan ke customer.
          </p>
        </div>
        <Button asChild>
          <Link href="/sales-orders/new">Buat SO</Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="rounded-lg border border-border bg-card shadow-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. SO</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-48">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salesOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Belum ada sales order. Buat order pertama untuk memulai.
                </TableCell>
              </TableRow>
            ) : (
              salesOrders.map((so) => (
                <TableRow key={so.$id}>
                  <TableCell className="font-mono text-xs">{so.so_number}</TableCell>
                  <TableCell className="font-medium">{so.customer_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(so.order_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_STYLES[so.status] ?? ""}>
                      {STATUS_LABELS[so.status] ?? so.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(so.total_amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {so.status === "draft" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConfirm(so.$id)}
                            disabled={processingId === so.$id}
                          >
                            {processingId === so.$id ? "..." : "Konfirmasi"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleCancel(so.$id)}
                            disabled={processingId === so.$id}
                          >
                            {processingId === so.$id ? "..." : "Batalkan"}
                          </Button>
                        </>
                      )}
                      {so.status !== "draft" && (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
