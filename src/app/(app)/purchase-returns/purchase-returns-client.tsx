"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { PurchaseReturnWithItems } from "@/lib/purchase-return";
import { _cancelPurchaseReturn, _postPurchaseReturn } from "./actions";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  posted: "default",
  cancelled: "destructive",
};

type Props = {
  initialData: PurchaseReturnWithItems[];
};

export function PurchaseReturnsClient({ initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function handleCancel(prId: string) {
    setProcessingId(prId);
    setError(null);
    const result = await _cancelPurchaseReturn(prId);
    if (result.error) {
      setError(result.error);
      setProcessingId(null);
      return;
    }
    startTransition(() => router.refresh());
    setProcessingId(null);
  }

  async function handlePost(prId: string) {
    setProcessingId(prId);
    setError(null);
    const result = await _postPurchaseReturn(prId);
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
            <CardTitle>Purchase Returns</CardTitle>
            <CardDescription>Retur pembelian ke supplier</CardDescription>
          </div>
          <Button asChild>
            <Link href="/purchase-returns/new">Retur Barang</Link>
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
              <TableHead>No. PR</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>PO</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Belum ada purchase return.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((pr) => (
                <TableRow key={pr.$id}>
                  <TableCell className="font-medium">{pr.return_number}</TableCell>
                  <TableCell>{pr.supplier_name}</TableCell>
                  <TableCell>{pr.po_number}</TableCell>
                  <TableCell>{pr.return_date}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[pr.status] ?? "outline"}>{pr.status}</Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    {pr.status === "draft" && (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancel(pr.$id)}
                          disabled={processingId === pr.$id}
                        >
                          {processingId === pr.$id ? "Batal..." : "Batalkan"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePost(pr.$id)}
                          disabled={processingId === pr.$id}
                        >
                          {processingId === pr.$id ? "Posting..." : "Posting"}
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
