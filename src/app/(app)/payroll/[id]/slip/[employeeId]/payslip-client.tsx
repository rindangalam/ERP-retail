"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import type { PayrollRun, PayrollDetailWithName } from "@/lib/payroll";
import type { SalaryComponent } from "@/lib/employee";

type Props = { run: PayrollRun; detail: PayrollDetailWithName; components: SalaryComponent[] };

function idr(n: number) { return n.toLocaleString("id-ID"); }

export function PayslipClient({ run, detail, components }: Props) {
  const allowances = components.filter((c) => c.component_type === "allowance" && c.is_active);
  const deductions = components.filter((c) => c.component_type === "deduction" && c.is_active);

  const handlePrint = () => { window.print(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <Button size="sm" variant="outline" asChild><Link href={"/payroll/" + run.$id}>Kembali</Link></Button>
        <Button size="sm" onClick={handlePrint}>Cetak Slip</Button>
      </div>

      <div className="max-w-lg mx-auto rounded-lg border border-border bg-card shadow-card p-6 print:p-4 print:border-none print:shadow-none" id="payslip">
        <div className="text-center mb-6 border-b pb-4">
          <h1 className="text-lg font-semibold tracking-tight">SLIP GAJI</h1>
          <p className="text-sm text-muted-foreground">PT Retail Indonesia</p>
        </div>

        <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-sm mb-4">
          <span className="text-muted-foreground">No. Karyawan</span>
          <span className="font-mono">{detail.employee_number}</span>
          <span className="text-muted-foreground">Nama</span>
          <span className="font-semibold">{detail.employee_name}</span>
          <span className="text-muted-foreground">Periode</span>
          <span>{run.period}</span>
          <span className="text-muted-foreground">Tanggal Bayar</span>
          <span>{run.run_date}</span>
          <span className="text-muted-foreground">No. Payroll</span>
          <span className="font-mono">{run.payroll_number}</span>
          <span className="text-muted-foreground">Status</span>
          <Badge variant={run.status === "posted" ? "default" : run.status === "cancelled" ? "destructive" : "secondary"}>{run.status}</Badge>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold border-b mb-2">Pendapatan</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Komponen</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell>Gaji Pokok</TableCell><TableCell className="text-right font-mono tabular-nums">{idr(detail.basic_salary)}</TableCell></TableRow>
                {allowances.map((c) => (
                  <TableRow key={c.$id}><TableCell>{c.name}</TableCell><TableCell className="text-right font-mono tabular-nums text-positive">+{idr(c.amount)}</TableCell></TableRow>
                ))}
                <TableRow className="font-semibold border-t"><TableCell>Total Pendapatan</TableCell><TableCell className="text-right font-mono tabular-nums">{idr(detail.basic_salary + detail.total_allowance)}</TableCell></TableRow>
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="text-sm font-semibold border-b mb-2">Potongan</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Komponen</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader>
              <TableBody>
                {deductions.length === 0 ? (
                  <TableRow><TableCell className="text-muted-foreground text-xs">Tidak ada potongan</TableCell><TableCell /></TableRow>
                ) : deductions.map((c) => (
                  <TableRow key={c.$id}><TableCell>{c.name}</TableCell><TableCell className="text-right font-mono tabular-nums text-destructive">-{idr(c.amount)}</TableCell></TableRow>
                ))}
                <TableRow className="font-semibold border-t"><TableCell>Total Potongan</TableCell><TableCell className="text-right font-mono tabular-nums">{idr(detail.total_deduction)}</TableCell></TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="border-t-2 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">GAJI BERSIH</span>
              <span className="text-lg font-bold font-mono tabular-nums">{idr(detail.net_salary)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-muted-foreground">
          <div className="text-center">
            <p>Diterima oleh,</p>
            <div className="mt-10 border-b border-dashed w-40 mx-auto" />
          </div>
          <div className="text-center">
            <p>Hormat kami,</p>
            <div className="mt-10 border-b border-dashed w-40 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}