"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import type { PayrollRun } from "@/lib/payroll";
import { runPayroll, cancelPR } from "./actions";

type Props = { initialData: PayrollRun[] };

export function PayrollClient({ initialData }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [period, setPeriod] = React.useState("");
  const [runDate, setRunDate] = React.useState(new Date().toISOString().slice(0, 10));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrors({});
    const result = await runPayroll(period, runDate);
    if (!result.ok) { setErrors(result.errors || {}); setLoading(false); return; }
    setShowForm(false); setLoading(false); router.refresh();
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Batalkan payroll ini?")) return;
    await cancelPR(id); router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Payroll</h1>
        {!showForm && <Button size="sm" onClick={() => { setShowForm(true); setErrors({}); }}>+ Generate Payroll</Button>}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-md border p-4 space-y-3 max-w-lg">
          <h2 className="font-semibold">Generate Payroll Baru</h2>
          {errors._form && <p className="text-sm text-red-600">{errors._form}</p>}
          {errors.period && <p className="text-sm text-red-600">{errors.period}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="period" className="text-sm font-medium">Periode (YYYY-MM)</label>
              <input id="period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-1">
              <label htmlFor="run_date" className="text-sm font-medium">Tanggal Proses</label>
              <input id="run_date" type="date" value={runDate} onChange={(e) => setRunDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" required />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>{loading ? "Memproses..." : "Generate"}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
          </div>
        </form>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">No.</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right w-[120px]">Total Gross</TableHead>
              <TableHead className="text-right w-[120px]">Total Deduction</TableHead>
              <TableHead className="text-right w-[120px]">Total Net</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[100px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Belum ada data payroll.</TableCell></TableRow>
            ) : (
              initialData.map((item) => (
                <TableRow key={item.$id}>
                  <TableCell className="font-mono text-xs">{item.payroll_number}</TableCell>
                  <TableCell>{item.period}</TableCell>
                  <TableCell className="text-xs">{item.run_date}</TableCell>
                  <TableCell className="text-right text-xs">{item.total_gross.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right text-xs">{item.total_deduction.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right text-xs font-medium">{item.total_net.toLocaleString("id-ID")}</TableCell>
                  <TableCell><Badge variant={item.status === "posted" ? "default" : item.status === "cancelled" ? "destructive" : "secondary"}>{item.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={"/payroll/" + item.$id}>Detail</Link>
                    </Button>
                    {item.status === "draft" && (
                      <Button size="sm" variant="ghost" onClick={() => handleCancel(item.$id)}>Batal</Button>
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