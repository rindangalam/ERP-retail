"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { GoodsReceiptWithItems } from "@/lib/goods-receipt";
import { _cancelGoodsReceipt, _postGoodsReceipt } from "./actions";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  posted: "default",
  cancelled: "destructive",
};

type Props = {
  initialData: GoodsReceiptWithItems[];
};

export function GoodsReceiptsClient({ initialData }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function handleCancel(grId: string) {
    setProcessingId(grId);
    setError(null);
    const result = await _cancelGoodsReceipt(grId);
    if (result.error) {
      setError(result.error);
      setProcessingId(null);
      return;
    }
    startTransition(() => router.refresh());
    setProcessingId(null);
  }

  async function handlePost(grId: string) {
    setProcessingId(grId);
    setError(null);
    const result = await _postGoodsReceipt(grId);
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
          <h1 className="text-lg font-semibold tracking-tight">Goods Receipt</h1>
          <p className="text-xs text-muted-foreground">Penerimaan barang dari supplier</p>
        </div>
        <Button asChild>
          <Link href="/goods-receipts/new">Terima Barang</Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="rounded-lg border border-border bg-card shadow-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. GR</TableHead>
              <TableHead>PO</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Belum ada goods receipt. Terima barang dari PO untuk memulai.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((gr) => (
                <TableRow key={gr.$id}>
                  <TableCell className="font-medium">{gr.gr_number}</TableCell>
                  <TableCell>{gr.po_number}</TableCell>
                  <TableCell>{gr.supplier_name}</TableCell>
                  <TableCell>{gr.received_date}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[gr.status] ?? "outline"}>{gr.status}</Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    {gr.status === "draft" && (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancel(gr.$id)}
                          disabled={processingId === gr.$id}
                        >
                          {processingId === gr.$id ? "Batal..." : "Batalkan"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePost(gr.$id)}
                          disabled={processingId === gr.$id}
                        >
                          {processingId === gr.$id ? "Posting..." : "Posting"}
                        </Button>
                      </>
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
