"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ChartOfAccount, AccountType } from "@/lib/coa";
import { createAccount, updateAccount, toggleAccount } from "./actions";

type Props = { initialData: ChartOfAccount[] };

const TYPE_LABEL: Record<AccountType, string> = {
  asset: "Aset", liability: "Liabilitas", equity: "Ekuitas", revenue: "Pendapatan", expense: "Beban",
};

const TYPE_VARIANT: Record<AccountType, "default" | "secondary" | "destructive" | "outline"> = {
  asset: "default", liability: "destructive", equity: "secondary", revenue: "outline", expense: "destructive",
};

export function ChartOfAccountsClient({ initialData }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = React.useState(false);
  const [editItem, setEditItem] = React.useState<ChartOfAccount | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [accountType, setAccountType] = React.useState<AccountType>("asset");

  const resetForm = () => {
    setCode(""); setName(""); setAccountType("asset"); setErrors({});
    setShowForm(false); setEditItem(null);
  };

  const openEdit = (item: ChartOfAccount) => {
    setEditItem(item); setCode(item.code); setName(item.name);
    setAccountType(item.account_type); setShowForm(true); setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrors({});
    if (editItem) {
      const result = await updateAccount(editItem.$id, { code, name, account_type: accountType });
      if (!result.ok) { setErrors(result.errors); setLoading(false); return; }
    } else {
      const result = await createAccount({ code, name, account_type: accountType });
      if (!result.ok) { setErrors(result.errors); setLoading(false); return; }
    }
    resetForm(); setLoading(false); router.refresh();
  };

  const handleToggle = async (id: string) => {
    await toggleAccount(id); router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Chart of Accounts</h1>
        {!showForm && (
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>+ Tambah Akun</Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-md border p-4 space-y-3 max-w-lg">
          <h2 className="font-semibold">{editItem ? "Edit Akun" : "Tambah Akun"}</h2>
          {errors._form && <p className="text-sm text-red-600">{errors._form}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="code" className="text-sm font-medium">Kode</label>
              <input id="code" value={code} onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" required />
              {errors.code && <p className="text-xs text-red-600">{errors.code}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">Nama</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" required />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="account_type" className="text-sm font-medium">Tipe Akun</label>
            <select id="account_type" value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}
              className="w-full rounded-md border px-3 py-2 text-sm">
              <option value="asset">Aset</option>
              <option value="liability">Liabilitas</option>
              <option value="equity">Ekuitas</option>
              <option value="revenue">Pendapatan</option>
              <option value="expense">Beban</option>
            </select>
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
              <TableHead className="w-[100px]">Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[140px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.map((item) => (
              <TableRow key={item.$id}>
                <TableCell className="font-mono text-xs">{item.code}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell><Badge variant={TYPE_VARIANT[item.account_type]}>{TYPE_LABEL[item.account_type]}</Badge></TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "default" : "secondary"}>
                    {item.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleToggle(item.$id)}>
                    {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
