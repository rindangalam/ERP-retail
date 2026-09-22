"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BestSellerRow,
  LowStockVariant,
  MarginData,
  TodayOmzet,
} from "@/lib/boutique-reports";

type Props = {
  today: string;
  omzet: TodayOmzet;
  bestSellers: BestSellerRow[];
  lowStock: LowStockVariant[];
  margin: MarginData;
};

function idr(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

function variantLabel(row: { size: string; color: string }) {
  const parts = [row.size, row.color].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function ButikClient({ today, omzet, bestSellers, lowStock, margin }: Props) {
  const router = useRouter();
  const [fromVal, setFromVal] = React.useState(margin.from_date);
  const [toVal, setToVal] = React.useState(margin.to_date);

  const applyFilter = () => {
    router.push(`/reports/butik?from=${fromVal}&to=${toVal}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">Laporan Butik</h1>

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
        <div className="rounded-lg border border-border bg-card shadow-card p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Omzet Hari Ini</h3>
          <p className="text-[10px] text-muted-foreground font-mono">
            {new Date(today).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums">Rp {idr(omzet.total)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {omzet.count} transaksi
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card shadow-card p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Margin Periode</h3>
          <p className="text-[10px] text-muted-foreground font-mono">{margin.from_date} s/d {margin.to_date}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>Pendapatan:</div>
            <div className="text-right font-mono tabular-nums">{idr(margin.revenue)}</div>
            <div>Modal (HPP):</div>
            <div className="text-right font-mono tabular-nums">{idr(margin.cost)}</div>
            <div>Terjual:</div>
            <div className="text-right font-mono tabular-nums">{margin.itemsSold} pcs</div>
            <div className="font-semibold border-t pt-1">Margin:</div>
            <div className={`text-right font-bold border-t pt-1 font-mono tabular-nums ${margin.margin >= 0 ? "text-positive" : "text-negative"}`}>
              {idr(margin.margin)}
            </div>
          </div>
          <div className="mt-2">
            <Badge variant={margin.margin >= 0 ? "default" : "destructive"}>
              {margin.margin >= 0 ? "Untung" : "Rugi"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Terlaris per Varian</h3>
        <div className="rounded-lg border border-border bg-card shadow-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Varian</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Terjual</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bestSellers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-4">Belum ada penjualan pada periode ini</TableCell></TableRow>
              ) : (
                bestSellers.map((row, i) => (
                  <TableRow key={`${row.product_variant_id ?? row.product_id}-${i}`}>
                    <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                    <TableCell className="text-xs font-medium">{row.product_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{variantLabel(row)}</TableCell>
                    <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums">{row.qty}</TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums">{idr(row.revenue)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stok Menipis per Varian</h3>
        <div className="rounded-lg border border-border bg-card shadow-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Varian</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStock.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-4">Semua varian stoknya aman</TableCell></TableRow>
              ) : (
                lowStock.map((row) => (
                  <TableRow key={row.variant_id}>
                    <TableCell className="text-xs font-medium">{row.product_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{variantLabel(row)}</TableCell>
                    <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums">{row.current_stock}</TableCell>
                    <TableCell className="text-right text-xs font-mono tabular-nums">{row.min_stock}</TableCell>
                    <TableCell><Badge variant="warning">Menipis</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
