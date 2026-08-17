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
import type { PurchaseOrderWithItems } from "@/lib/purchase-order";
import { cancelPurchaseOrderAction } from "./actions";

type PurchasingClientProps = {
  purchaseOrders: PurchaseOrderWithItems[];
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
  ordered: "text-blue-600",
  partial: "text-amber-600",
  received: "text-emerald-600",
  cancelled: "text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ordered: "Dipesan",
  partial: "Sebagian",
  received: "Diterima",
  cancelled: "Batal",
};

export function PurchasingClient({ purchaseOrders }: PurchasingClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase Order</h1>
          <p className="text-sm text-muted-foreground">
            Rencana pembelian ke supplier sebelum barang diterima.
          </p>
        </div>
        <Button asChild>
          <Link href="/purchasing/new">Buat PO</Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. PO</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-40">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Belum ada purchase order.
                </TableCell>
              </TableRow>
            ) : (
              purchaseOrders.map((po) => (
                <TableRow key={po.$id}>
                  <TableCell className="font-mono text-xs">{po.po_number}</TableCell>
                  <TableCell className="font-medium">{po.supplier_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(po.order_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_STYLES[po.status] ?? ""}>
                      {STATUS_LABELS[po.status] ?? po.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(po.total_amount)}
                  </TableCell>
                  <TableCell>
                    {po.status === "draft" ? (
                      <form action={cancelPurchaseOrderAction}>
                        <input type="hidden" name="id" value={po.$id} />
                        <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                          Batalkan
                        </Button>
                      </form>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
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
