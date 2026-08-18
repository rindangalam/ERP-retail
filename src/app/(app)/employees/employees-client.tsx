"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import type { Employee } from "@/lib/employee";
import { addEmployee, editEmployee } from "./actions";

type Props = { initialData: Employee[] };

export function EmployeesClient({ initialData }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = React.useState(false);
  const [editItem, setEditItem] = React.useState<Employee | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [empNumber, setEmpNumber] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [basicSalary, setBasicSalary] = React.useState("");
  const [hireDate, setHireDate] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const resetForm = () => {
    setEmpNumber(""); setFullName(""); setPosition(""); setBasicSalary("");
    setHireDate(""); setPhone(""); setErrors({});
    setShowForm(false); setEditItem(null);
  };

  const openEdit = (item: Employee) => {
    setEditItem(item); setEmpNumber(item.employee_number); setFullName(item.full_name);
    setPosition(item.position); setBasicSalary(String(item.basic_salary));
    setHireDate(item.hire_date); setPhone(item.phone || "");
    setShowForm(true); setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrors({});
    const input = { employee_number: empNumber, full_name: fullName, position, basic_salary: Number(basicSalary), hire_date: hireDate, phone };
    if (editItem) {
      const result = await editEmployee(editItem.$id, input);
      if (!result.ok) { setErrors(result.errors); setLoading(false); return; }
    } else {
      const result = await addEmployee(input);
      if (!result.ok) { setErrors(result.errors); setLoading(false); return; }
    }
    resetForm(); setLoading(false); router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Karyawan</h1>
        {!showForm && <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>+ Tambah Karyawan</Button>}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-md border p-4 space-y-3 max-w-lg">
          <h2 className="font-semibold">{editItem ? "Edit Karyawan" : "Tambah Karyawan"}</h2>
          {errors._form && <p className="text-sm text-red-600">{errors._form}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="emp_number" className="text-sm font-medium">No. Karyawan</label>
              <input id="emp_number" value={empNumber} onChange={(e) => setEmpNumber(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" required />
              {errors.employee_number && <p className="text-xs text-red-600">{errors.employee_number}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="full_name" className="text-sm font-medium">Nama Lengkap</label>
              <input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" required />
              {errors.full_name && <p className="text-xs text-red-600">{errors.full_name}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="position" className="text-sm font-medium">Jabatan</label>
              <input id="position" value={position} onChange={(e) => setPosition(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-1">
              <label htmlFor="basic_salary" className="text-sm font-medium">Gaji Pokok</label>
              <input id="basic_salary" type="number" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" required min="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="hire_date" className="text-sm font-medium">Tanggal Masuk</label>
              <input id="hire_date" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-1">
              <label htmlFor="phone" className="text-sm font-medium">Telepon</label>
              <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>{loading ? "Menyimpan..." : editItem ? "Update" : "Simpan"}</Button>
            <Button type="button" size="sm" variant="outline" onClick={resetForm}>Batal</Button>
          </div>
        </form>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">No.</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead className="text-right w-[120px]">Gaji Pokok</TableHead>
              <TableHead>Masuk</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[120px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada karyawan.</TableCell></TableRow>
            ) : (
              initialData.map((item) => (
                <TableRow key={item.$id}>
                  <TableCell className="font-mono text-xs">{item.employee_number}</TableCell>
                  <TableCell>{item.full_name}</TableCell>
                  <TableCell className="text-xs">{item.position}</TableCell>
                  <TableCell className="text-right text-xs">{item.basic_salary.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-xs">{item.hire_date}</TableCell>
                  <TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status === "active" ? "Aktif" : "Keluar"}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Edit</Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/employees/${item.$id}`}>Detail</Link>
                    </Button>
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
