"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import type { PayrollRun, PayrollDetailWithName } from "@/lib/payroll";

type Props = { run: PayrollRun; details: PayrollDetailWithName[] };

export function PayrollDetailClient({ run, details }: Props) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Slip Gaji - {run.payroll_number}</h1>
            <Badge variant={run.status === "posted" ? "default" : run.status === "cancelled" ? "destructive" : "secondary"}>{run.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Periode: {run.period} | Tanggal: {run.run_date}</p>
        </div>
        <Button size="sm" variant="outline" asChild><Link href="/payroll">Kembali</Link></Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">No. Karyawan</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className="text-right w-[120px]">Gaji Pokok</TableHead>
              <TableHead className="text-right w-[120px]">Tunjangan</TableHead>
              <TableHead className="text-right w-[120px]">Potongan</TableHead>
              <TableHead className="text-right w-[120px]">Gaji Bersih</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Tidak ada detail.</TableCell></TableRow>
            ) : (
              details.map((d) => (
                <TableRow key={d.$id}>
                  <TableCell className="font-mono text-xs">{d.employee_number}</TableCell>
                  <TableCell>{d.employee_name}</TableCell>
                  <TableCell className="text-right text-xs">{d.basic_salary.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right text-xs text-green-600">+{d.total_allowance.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right text-xs text-red-600">-{d.total_deduction.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right text-xs font-bold">{d.net_salary.toLocaleString("id-ID")}</TableCell>
                </TableRow>
              ))
            )}
            {details.length > 0 && (
              <TableRow className="font-semibold border-t">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right text-xs">{details.reduce((s, d) => s + d.basic_salary, 0).toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-right text-xs text-green-600">+{details.reduce((s, d) => s + d.total_allowance, 0).toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-right text-xs text-red-600">-{details.reduce((s, d) => s + d.total_deduction, 0).toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-right text-xs font-bold">{details.reduce((s, d) => s + d.net_salary, 0).toLocaleString("id-ID")}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm max-w-md">
        <div className="rounded-md border p-3 text-center">
          <p className="text-muted-foreground text-xs">Total Gross</p>
          <p className="font-bold">{run.total_gross.toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-md border p-3 text-center">
          <p className="text-muted-foreground text-xs">Total Deduction</p>
          <p className="font-bold text-red-600">{run.total_deduction.toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-md border p-3 text-center">
          <p className="text-muted-foreground text-xs">Total Net</p>
          <p className="font-bold text-lg">{run.total_net.toLocaleString("id-ID")}</p>
        </div>
      </div>
    </div>
  );
}