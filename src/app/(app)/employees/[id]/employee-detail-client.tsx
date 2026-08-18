"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import type { Employee, SalaryComponent } from "@/lib/employee";
import { addSalaryComponent, toggleSC } from "../actions";

type Props = { employee: Employee; components: SalaryComponent[] };

export function EmployeeDetailClient({ employee, components }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [compType, setCompType] = React.useState<"allowance" | "deduction">("allowance");
  const [compName, setCompName] = React.useState("");
  const [compAmount, setCompAmount] = React.useState("");
  const resetForm = () => { setCompType("allowance"); setCompName(""); setCompAmount(""); setErrors({}); setShowForm(false); };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setErrors({});
    const result = await addSalaryComponent(employee.$id, { component_type: compType, name: compName, amount: Number(compAmount) });
    if (!result.ok) { setErrors(result.errors); setLoading(false); return; }
    resetForm(); setLoading(false); router.refresh();
  };
  const handleToggle = async (id: string) => { await toggleSC(id); router.refresh(); };
  const allowances = components.filter((c) => c.component_type === "allowance" && c.is_active).reduce((s, c) => s + c.amount, 0);
  const deductions = components.filter((c) => c.component_type === "deduction" && c.is_active).reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{employee.full_name}</h1>
            <Badge variant={employee.status === "active" ? "default" : "secondary"}>{employee.status === "active" ? "Aktif" : "Keluar"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{employee.employee_number} - {employee.position}</p>
        </div>
        <Button size="sm" variant="outline" asChild><Link href="/employees">Kembali</Link></Button>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm rounded-md border p-4 max-w-xl">
        <div><span className="text-muted-foreground">Gaji Pokok:</span><p className="font-medium">{employee.basic_salary.toLocaleString("id-ID")}</p></div>
        <div><span className="text-muted-foreground">Tanggal Masuk:</span><p>{employee.hire_date}</p></div>
        <div><span className="text-muted-foreground">Telepon:</span><p>{employee.phone || "-"}</p></div>
        <div><span className="text-muted-foreground">Estimasi Gaji Bersih:</span><p className="font-bold">{(employee.basic_salary + allowances - deductions).toLocaleString("id-ID")}</p></div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Komponen Gaji</h2>
          {!showForm && <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>+ Tambah</Button>}
        </div>
        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-md border p-3 space-y-3 max-w-lg">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="comp_type" className="text-xs font-medium">Tipe</label>
                <select id="comp_type" value={compType} onChange={(e) => setCompType(e.target.value as "allowance" | "deduction")} className="w-full rounded-md border px-2 py-1.5 text-sm">
                  <option value="allowance">Tunjangan</option><option value="deduction">Potongan</option>
                </select>
              </div>
              <div className="space-y-1"><label htmlFor="comp_name" className="text-xs font-medium">Nama</label><input id="comp_name" value={compName} onChange={(e) => setCompName(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" required /></div>
              <div className="space-y-1"><label htmlFor="comp_amount" className="text-xs font-medium">Jumlah</label><input id="comp_amount" type="number" value={compAmount} onChange={(e) => setCompAmount(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" required min="0" /></div>
            </div>
            <div className="flex gap-2"><Button type="submit" size="sm" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button><Button type="button" size="sm" variant="outline" onClick={resetForm}>Batal</Button></div>
          </form>
        )}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Tipe</TableHead><TableHead>Nama</TableHead><TableHead className="text-right w-[120px]">Jumlah</TableHead><TableHead>Status</TableHead><TableHead className="text-right w-[80px]">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {components.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">Belum ada komponen gaji.</TableCell></TableRow>) : (
                components.map((c) => (<TableRow key={c.$id}><TableCell><Badge variant={c.component_type === "allowance" ? "default" : "destructive"}>{c.component_type === "allowance" ? "Tunjangan" : "Potongan"}</Badge></TableCell><TableCell>{c.name}</TableCell><TableCell className="text-right text-xs">{c.amount.toLocaleString("id-ID")}</TableCell><TableCell><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Aktif" : "Nonaktif"}</Badge></TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => handleToggle(c.$id)}>{c.is_active ? "Nonaktifkan" : "Aktifkan"}</Button></TableCell></TableRow>))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm max-w-md">
          <div className="rounded-md border p-3 text-center"><p className="text-muted-foreground text-xs">Total Tunjangan</p><p className="font-bold text-green-600">{allowances.toLocaleString("id-ID")}</p></div>
          <div className="rounded-md border p-3 text-center"><p className="text-muted-foreground text-xs">Total Potongan</p><p className="font-bold text-red-600">{deductions.toLocaleString("id-ID")}</p></div>
          <div className="rounded-md border p-3 text-center"><p className="text-muted-foreground text-xs">Gaji Bersih</p><p className="font-bold">{(employee.basic_salary + allowances - deductions).toLocaleString("id-ID")}</p></div>
        </div>
      </div>
    </div>
  );
}