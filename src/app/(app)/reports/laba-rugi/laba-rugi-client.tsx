"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { IncomeStatementData, AccountBalance } from "@/lib/reports";

type Props = { data: IncomeStatementData };

function Section({ title, items, total }: { title: string; items: AccountBalance[]; total: number }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="rounded-lg border border-border bg-card shadow-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Kode</TableHead>
              <TableHead>Nama Akun</TableHead>
              <TableHead className="text-right w-[140px]">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-4">Tidak ada data</TableCell></TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.account_id}>
                  <TableCell className="font-mono text-xs">{item.account_code}</TableCell>
                  <TableCell>{item.account_name}</TableCell>
                  <TableCell className="text-right text-xs font-mono tabular-nums">{item.balance.toLocaleString("id-ID")}</TableCell>
                </TableRow>
              ))
            )}
            <TableRow className="font-semibold border-t">
              <TableCell colSpan={2}>Total {title}</TableCell>
              <TableCell className="text-right text-xs font-mono tabular-nums">{total.toLocaleString("id-ID")}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function LabaRugiClient({ data }: Props) {
  const router = useRouter();
  const [fromVal, setFromVal] = React.useState(data.from_date);
  const [toVal, setToVal] = React.useState(data.to_date);

  const applyFilter = () => {
    router.push(`/reports/laba-rugi?from=${fromVal}&to=${toVal}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">Laba Rugi</h1>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Pendapatan" items={data.revenues} total={data.totalRevenue} />
        <Section title="Beban" items={data.expenses} total={data.totalExpenses} />
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card p-4 max-w-md">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Laba Bersih</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Total Pendapatan:</div><div className="text-right font-mono tabular-nums">{data.totalRevenue.toLocaleString("id-ID")}</div>
          <div>Total Beban:</div><div className="text-right font-mono tabular-nums">{data.totalExpenses.toLocaleString("id-ID")}</div>
          <div className="font-semibold border-t pt-1">Laba Bersih:</div>
          <div className={`text-right font-bold border-t pt-1 font-mono tabular-nums ${data.netIncome >= 0 ? "text-positive" : "text-negative"}`}>{data.netIncome.toLocaleString("id-ID")}</div>
        </div>
        <div className="mt-2">
          <Badge variant={data.netIncome >= 0 ? "default" : "destructive"}>
            {data.netIncome >= 0 ? "Laba" : "Rugi"}
          </Badge>
        </div>
      </div>
    </div>
  );
}
