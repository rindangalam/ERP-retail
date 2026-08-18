"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import type { JournalEntry } from "@/lib/journal";
import { sourceTypeLabel } from "@/lib/source-labels";

type Props = { initialData: JournalEntry[] };

export function JournalEntriesClient({ initialData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sourceType, setSourceType] = React.useState(searchParams.get("source_type") ?? "");
  const [fromDate, setFromDate] = React.useState(searchParams.get("from") ?? "");
  const [toDate, setToDate] = React.useState(searchParams.get("to") ?? "");

  const applyFilter = () => {
    const params = new URLSearchParams();
    if (sourceType) params.set("source_type", sourceType);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    router.push(`/journal-entries?${params.toString()}`);
  };

  const clearFilter = () => {
    setSourceType(""); setFromDate(""); setToDate("");
    router.push("/journal-entries");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Jurnal Umum</h1>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
        <div className="space-y-1">
          <label htmlFor="source_type" className="text-xs font-medium">Sumber</label>
          <select id="source_type" value={sourceType} onChange={(e) => setSourceType(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm">
            <option value="">Semua</option>
            <option value="goods_receipt">Goods Receipt</option>
            <option value="sales_invoice">Sales Invoice</option>
            <option value="sales_payment">Sales Payment</option>
            <option value="sales_return">Sales Return</option>
            <option value="purchase_return">Purchase Return</option>
            <option value="stock_opname">Stock Opname</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="from" className="text-xs font-medium">Dari</label>
          <input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="to" className="text-xs font-medium">Sampai</label>
          <input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm" />
        </div>
        <Button size="sm" onClick={applyFilter}>Filter</Button>
        <Button size="sm" variant="ghost" onClick={clearFilter}>Reset</Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">No. Jurnal</TableHead>
              <TableHead className="w-[110px]">Tanggal</TableHead>
              <TableHead>Sumber</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right w-[120px]">Debit</TableHead>
              <TableHead className="text-right w-[120px]">Kredit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Belum ada data jurnal.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((entry) => (
                <TableRow key={entry.$id}>
                  <TableCell>
                    <Link href={`/journal-entries/${entry.$id}`} className="text-blue-600 hover:underline font-mono text-xs">
                      {entry.entry_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{entry.entry_date}</TableCell>
                  <TableCell><Badge variant="outline">{sourceTypeLabel(entry.source_type)}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{entry.description}</TableCell>
                  <TableCell className="text-right text-xs">{entry.total_debit.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right text-xs">{entry.total_credit.toLocaleString("id-ID")}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status === "posted" ? "default" : "secondary"}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">Menampilkan {initialData.length} jurnal</p>
    </div>
  );
}
