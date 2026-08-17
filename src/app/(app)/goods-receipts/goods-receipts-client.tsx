"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [isPending, startTransition] = useTransition();
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Goods Receipt</CardTitle>
            <CardDescription>Penerimaan barang dari supplier</CardDescription>
          </div>
          <Button asChild>
            <Link href="/goods-receipts/new">Terima Barang</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
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
                  Belum ada goods receipt.
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
      </CardContent>
    </Card>
  );
}
