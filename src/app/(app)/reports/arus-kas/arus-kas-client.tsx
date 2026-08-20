"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CashFlowData, CashFlowItem } from "@/lib/reports";

type Props = { data: CashFlowData };

function CashFlowSection({ title, items, totalIn, totalOut }: {
  title: string; items: CashFlowItem[]; totalIn: number; totalOut: number;
}) {
  const net = totalIn - totalOut;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="rounded-lg border border-border bg-card shadow-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sumber</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right w-[120px]">Masuk</TableHead>
              <TableHead className="text-right w-[120px]">Keluar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-xs py-4">Tidak ada data</TableCell></TableRow>
            ) : (
              items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs">{item.source_type}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{item.description}</TableCell>
                  <TableCell className="text-right text-xs font-mono tabular-nums">{item.amount_in > 0 ? item.amount_in.toLocaleString("id-ID") : "-"}</TableCell>
                  <TableCell className="text-right text-xs font-mono tabular-nums">{item.amount_out > 0 ? item.amount_out.toLocaleString("id-ID") : "-"}</TableCell>
                </TableRow>
              ))
            )}
            <TableRow className="font-semibold border-t">
              <TableCell colSpan={2}>Net {title}</TableCell>
              <TableCell className="text-right text-xs font-mono tabular-nums" colSpan={2}>
                {net.toLocaleString("id-ID")}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ArusKasClient({ data }: Props) {
  const router = useRouter();
  const [fromVal, setFromVal] = React.useState(data.from_date);
  const [toVal, setToVal] = React.useState(data.to_date);

  const applyFilter = () => {
    router.push(`/reports/arus-kas?from=${fromVal}&to=${toVal}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">Arus Kas</h1>

      <div className="flex items-end gap-3 rounded-lg border border-border bg-card shadow-card p-3">
        <div className="space-y-1">
          <label htmlFor="from" className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Dari</label>
          <input id="from" type="date" value={fromVal} onChange={(e) => setFromVal(e.target.value)}
            className="rounded-md border border-input px-2 py-1.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="to" className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sampai</label>
          <input id="to" type="date" value={toVal} onChange={(e) => setToVal(e.target.value)}
            className="rounded-md border border-input px-2 py-1.5 text-sm" />
        </div>
        <Button size="sm" onClick={applyFilter}>Tampilkan</Button>
      </div>

      <CashFlowSection title="Operasional" items={data.operating} totalIn={data.totalOperatingIn} totalOut={data.totalOperatingOut} />
      <CashFlowSection title="Investasi" items={data.investing} totalIn={data.totalInvestingIn} totalOut={data.totalInvestingOut} />
      <CashFlowSection title="Pendanaan" items={data.financing} totalIn={data.totalFinancingIn} totalOut={data.totalFinancingOut} />

      <div className="rounded-lg border border-border bg-card shadow-card p-4 max-w-md">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Net Perubahan Kas</h3>
        <p className={`font-mono text-lg font-semibold tabular-nums ${data.netCashFlow >= 0 ? "text-positive" : "text-negative"}`}>{data.netCashFlow.toLocaleString("id-ID")}</p>
      </div>
    </div>
  );
}
