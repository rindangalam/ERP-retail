"use client";

import Link from "next/link";
import * as React from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import {
  Boxes,
  Wallet,
  TrendingUp,
  Users,
  PackageSearch,
  ShoppingCart,
  Receipt,
  Landmark,
  BookOpen,
  Scale,
  FileText,
  BoxesIcon,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardSummary } from "@/lib/dashboard";

type Props = { summary: DashboardSummary; role: string };

const EASE = [0.16, 1, 0.3, 1] as const;

function idr(n: number) { return new Intl.NumberFormat("id-ID").format(n); }
function idrShort(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
  if (Math.abs(n) >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`;
  return `Rp ${n}`;
}

const sourceLabels: Record<string, string> = {
  goods_receipt: "Goods Receipt",
  sales_invoice: "Sales Invoice",
  sales_payment: "Pembayaran",
  purchase_return: "Retur Beli",
  sales_return: "Retur Jual",
  stock_opname: "Stock Opname",
  manual: "Manual",
};

function Sparkline({ data, positive }: { data: { amount: number }[]; positive: boolean }) {
  const reduce = useReducedMotion();
  const color = positive ? "var(--positive)" : "var(--negative)";
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${positive ? "p" : "n"}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="amount"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${positive ? "p" : "n"})`}
            isAnimationActive={!reduce}
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AnimatedNumber({
  value,
  format,
  reduce,
}: {
  value: number;
  format: (n: number) => string;
  reduce: boolean | null;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    if (reduce || !Number.isFinite(value)) {
      ref.current.textContent = format(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, format, reduce]);

  return <span ref={ref} />;
}

function StatCell({
  label,
  value,
  format,
  sub,
  negative,
  trend,
  spark,
  icon: Icon,
  delay,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  sub?: string;
  negative?: boolean;
  trend?: number;
  spark?: { amount: number }[];
  icon: React.ComponentType<{ className?: string }>;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const fmt = format ?? ((n: number) => String(n));
  return (
    <motion.div
      className="rounded-lg border border-border bg-card px-4 py-3 shadow-card"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: EASE }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Icon className="size-4" />
        </span>
      </div>
      <div className={`mt-1 font-mono text-lg font-semibold tabular-nums ${negative ? "text-negative" : ""}`}>
        <AnimatedNumber value={value} format={fmt} reduce={reduce} />
      </div>
      <div className="flex items-center gap-2">
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${trend >= 0 ? "text-positive" : "text-negative"}`}>
            {trend >= 0 ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {spark && <Sparkline data={spark} positive={!negative} />}
    </motion.div>
  );
}

export function DashboardClient({ summary, role }: Props) {
  const showFinance = role === "admin" || role === "finance";
  const showInventory = role === "admin" || role === "warehouse";
  const reduce = useReducedMotion();

  const last7 = summary.revenueSeries.slice(-7);
  const total7 = last7.reduce((s, d) => s + d.amount, 0);
  const prev7 = summary.revenueSeries.slice(-14, -7).reduce((s, d) => s + d.amount, 0);
  const trend = prev7 > 0 ? Math.round(((total7 - prev7) / prev7) * 100) : undefined;

  const quickLinks: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [];
  if (showInventory) {
    quickLinks.push(
      { href: "/products", label: "Produk", icon: Boxes },
      { href: "/stock-opname", label: "Stock Opname", icon: PackageSearch },
    );
  }
  if (role === "admin" || role === "purchasing") {
    quickLinks.push({ href: "/purchasing", label: "Purchasing", icon: ShoppingCart });
  }
  if (role === "admin" || role === "sales") {
    quickLinks.push({ href: "/sales-invoices", label: "Penjualan", icon: Receipt }, { href: "/customers", label: "Customer", icon: Users });
  }
  if (showFinance) {
    quickLinks.push(
      { href: "/cash-bank", label: "Kas & Bank", icon: Landmark },
      { href: "/journal-entries", label: "Jurnal", icon: BookOpen },
      { href: "/reports/neraca", label: "Neraca", icon: Scale },
      { href: "/reports/laba-rugi", label: "Laba Rugi", icon: FileText },
    );
  }

  const totalRevenue = summary.revenueSeries.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
        <div className="text-xs text-muted-foreground font-mono">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCell
          label="Total Produk"
          value={summary.totalProducts}
          format={String}
          sub={summary.lowStockCount > 0 ? `${summary.lowStockCount} stok menipis` : undefined}
          icon={BoxesIcon}
          delay={0}
        />
        <StatCell
          label="Nilai Persediaan"
          value={summary.totalStockValue}
          format={idrShort}
          icon={Boxes}
          delay={0.05}
        />
        {showFinance && (
          <>
            <StatCell
              label="Saldo Kas & Bank"
              value={summary.cashBalance}
              format={idrShort}
              icon={Wallet}
              delay={0.1}
            />
            <StatCell
              label="Laba Bersih"
              value={summary.retainedEarnings}
              format={idrShort}
              negative={summary.retainedEarnings < 0}
              icon={TrendingUp}
              delay={0.15}
            />
          </>
        )}
        {!showFinance && (
          <StatCell label="Total Karyawan" value={summary.totalEmployees} format={String} icon={Users} delay={0.1} />
        )}
        {showFinance && (
          <>
            <StatCell label="Total Aset" value={summary.totalAssets} format={idrShort} sub="Hingga saat ini" icon={Landmark} delay={0.2} />
            <StatCell label="Total Liabilitas" value={summary.totalLiabilities} format={idrShort} sub="Hingga saat ini" icon={Scale} delay={0.25} />
          </>
        )}
      </div>

      {showFinance && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <motion.div
          className="rounded-lg border border-border bg-card p-4 shadow-card lg:col-span-2"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: EASE }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Pendapatan 30 Hari</h2>
              <p className="text-xs text-muted-foreground">
                Total: <span className="font-mono font-semibold">{idr(totalRevenue)}</span>
                {trend !== undefined && (
                  <span className={`ml-2 inline-flex items-center gap-0.5 text-[10px] font-medium ${trend >= 0 ? "text-positive" : "text-negative"}`}>
                    {trend >= 0 ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
                    {trend}% vs 7 hari sebelumnya
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.revenueSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono)" }}
                  tickFormatter={(v: string) => v.slice(5)}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono)" }}
                  tickFormatter={(v: number) => idrShort(v)}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    boxShadow: "0 12px 32px -8px rgb(0 0 0 / 0.14)",
                    fontSize: "12px",
                    fontFamily: "var(--font-ibm-plex-mono)",
                  }}
                  formatter={(v) => (typeof v === "number" ? [idr(v), "Pendapatan"] : [String(v), "Pendapatan"])}
                  labelFormatter={(l) => (typeof l === "string" ? new Date(l).toLocaleDateString("id-ID") : String(l))}
                />
                <Bar
                  dataKey="amount"
                  fill="var(--brand)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!reduce}
                  animationDuration={700}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          className="rounded-lg border border-border bg-card p-4 shadow-card"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35, ease: EASE }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Kategori Produk</h2>
              <p className="text-xs text-muted-foreground">Distribusi per kategori</p>
            </div>
          </div>
          {summary.categoryDistribution.length > 0 ? (
            <div className="mt-3 flex items-center gap-4">
              <div className="h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.categoryDistribution}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={36}
                      outerRadius={56}
                      paddingAngle={2}
                      strokeWidth={0}
                      isAnimationActive={!reduce}
                      animationDuration={700}
                    >
                      {summary.categoryDistribution.map((_, i) => (
                        <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        boxShadow: "0 12px 32px -8px rgb(0 0 0 / 0.14)",
                        fontSize: "12px",
                        fontFamily: "var(--font-ibm-plex-mono)",
                      }}
                      formatter={(v, name) => [`${v} produk`, String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {summary.categoryDistribution.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: `var(--chart-${(i % 5) + 1})` }} />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">{c.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-10 text-center text-xs text-muted-foreground">Belum ada produk berkategori.</p>
          )}
        </motion.div>
        </div>
      )}

      {showInventory && summary.lowStock.length > 0 && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35, ease: EASE }}
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Stok Menipis</h2>
            <Link href="/products" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              Lihat Semua
            </Link>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-card">
            {summary.lowStock.map((p, i) => (
              <motion.div
                key={p.id}
                initial={reduce ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.4 + i * 0.05, ease: EASE }}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Boxes className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{p.name}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    Stok {p.current_stock} · min {p.min_stock}
                  </span>
                </span>
                <Badge variant="warning">Menipis</Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {showFinance && summary.recentEntries.length > 0 && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: EASE }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold tracking-tight">Jurnal Terbaru</h2>
            <Link href="/journal-entries" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Lihat Semua
            </Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Sumber</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentEntries.map((e, i) => (
                  <motion.tr
                    key={i}
                    initial={reduce ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.45 + i * 0.05, ease: EASE }}
                    className="border-b border-border transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="font-mono text-xs">{e.entry_number}</TableCell>
                    <TableCell className="text-xs">{e.entry_date}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-mono">{sourceLabels[e.source_type] ?? e.source_type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{e.description}</TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5, ease: EASE }}
      >
        <h2 className="text-sm font-semibold tracking-tight mb-2">Akses Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {quickLinks.map((link, i) => (
            <motion.div
              key={link.href}
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.55 + i * 0.04, ease: EASE }}
            >
              <Link
                href={link.href}
                className="group flex items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2.5 text-sm shadow-xs transition-all hover:-translate-y-px hover:border-foreground/30 hover:shadow-card-hover"
              >
                <link.icon className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-brand" />
                <span className="font-medium">{link.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
