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
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="rounded-md border overflow-x-auto">
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
                  <TableCell className="text-right text-xs">{item.amount_in > 0 ? item.amount_in.toLocaleString("id-ID") : "-"}</TableCell>
                  <TableCell className="text-right text-xs">{item.amount_out > 0 ? item.amount_out.toLocaleString("id-ID") : "-"}</TableCell>
                </TableRow>
              ))
            )}
            <TableRow className="font-semibold border-t">
              <TableCell colSpan={2}>Net {title}</TableCell>
              <TableCell className="text-right text-xs" colSpan={2}>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Arus Kas (Cash Flow Statement)</h1>
      </div>

      <div className="flex items-end gap-3 rounded-md border p-3">
        <div className="space-y-1">
          <label htmlFor="from" className="text-xs font-medium">Dari</label>
          <input id="from" type="date" value={fromVal} onChange={(e) => setFromVal(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="to" className="text-xs font-medium">Sampai</label>
          <input id="to" type="date" value={toVal} onChange={(e) => setToVal(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm" />
        </div>
        <Button size="sm" onClick={applyFilter}>Tampilkan</Button>
      </div>

      <CashFlowSection title="Operasional" items={data.operating} totalIn={data.totalOperatingIn} totalOut={data.totalOperatingOut} />
      <CashFlowSection title="Investasi" items={data.investing} totalIn={data.totalInvestingIn} totalOut={data.totalInvestingOut} />
      <CashFlowSection title="Pendanaan" items={data.financing} totalIn={data.totalFinancingIn} totalOut={data.totalFinancingOut} />

      <div className="rounded-md border p-4 max-w-md">
        <h3 className="font-semibold text-sm mb-2">Net Perubahan Kas</h3>
        <p className="text-lg font-bold">{data.netCashFlow.toLocaleString("id-ID")}</p>
      </div>
    </div>
  );
}
