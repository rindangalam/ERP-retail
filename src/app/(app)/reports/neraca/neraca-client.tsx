"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BalanceSheetData, AccountBalance } from "@/lib/reports";

type Props = { data: BalanceSheetData };

function BalanceRow({ item }: { item: AccountBalance }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{item.account_code}</TableCell>
      <TableCell>{item.account_name}</TableCell>
      <TableCell className="text-right text-xs">{item.balance.toLocaleString("id-ID")}</TableCell>
    </TableRow>
  );
}

function BalanceSection({ title, items, total, totalLabel }: {
  title: string; items: AccountBalance[]; total: number; totalLabel: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="rounded-md border overflow-x-auto">
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
              items.map((item) => <BalanceRow key={item.account_id} item={item} />)
            )}
            <TableRow className="font-semibold border-t">
              <TableCell colSpan={2}>{totalLabel}</TableCell>
              <TableCell className="text-right text-xs">{total.toLocaleString("id-ID")}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function NeracaClient({ data }: Props) {
  const router = useRouter();
  const [dateVal, setDateVal] = React.useState(data.as_of_date);

  const applyFilter = () => {
    router.push(`/reports/neraca?as_of=${dateVal}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Neraca (Balance Sheet)</h1>
      </div>

      <div className="flex items-end gap-3 rounded-md border p-3">
        <div className="space-y-1">
          <label htmlFor="as_of" className="text-xs font-medium">Tanggal</label>
          <input id="as_of" type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm" />
        </div>
        <Button size="sm" onClick={applyFilter}>Tampilkan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <BalanceSection title="Aset (Assets)" items={data.assets} total={data.totalAssets} totalLabel="Total Aset" />
          <BalanceSection title="Liabilitas (Liabilities)" items={data.liabilities} total={data.totalLiabilities} totalLabel="Total Liabilitas" />
        </div>
        <div className="space-y-6">
          <BalanceSection title="Ekuitas (Equity)" items={data.equity} total={data.totalEquity - data.retainedEarnings} totalLabel="Total Ekuitas (tanpa Laba Ditahan)" />
          <div className="rounded-md border p-4 space-y-2 max-w-sm">
            <h3 className="font-semibold text-sm">Laba Ditahan (Retained Earnings)</h3>
            <p className="text-xs text-muted-foreground">Pendapatan - Beban (akumulasi sampai tanggal ini)</p>
            <p className="text-lg font-bold">{data.retainedEarnings.toLocaleString("id-ID")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-md border p-4 max-w-md">
        <h3 className="font-semibold text-sm mb-2">Verifikasi Kesetimbangan</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Total Aset:</div><div className="font-medium text-right">{data.totalAssets.toLocaleString("id-ID")}</div>
          <div>Total Liabilitas + Ekuitas:</div><div className="font-medium text-right">{(data.totalLiabilities + data.totalEquity).toLocaleString("id-ID")}</div>
        </div>
        <div className="mt-2 text-sm">
          {Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 1 ? (
            <span className="text-green-600 font-medium">✓ Seimbang</span>
          ) : (
            <span className="text-red-600 font-medium">✗ Tidak Seimbang (selisih: {(data.totalAssets - data.totalLiabilities - data.totalEquity).toLocaleString("id-ID")})</span>
          )}
        </div>
      </div>
    </div>
  );
}
