"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import type { CashBankAccount } from "@/lib/cash-bank";
import { createAccount } from "./actions";

type Props = { initialData: CashBankAccount[] };

export function CashBankClient({ initialData }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [name, setName] = React.useState("");
  const [accountType, setAccountType] = React.useState<"cash" | "bank">("cash");
  const [bankName, setBankName] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [openingBalance, setOpeningBalance] = React.useState("");

  const resetForm = () => {
    setName(""); setAccountType("cash"); setBankName("");
    setAccountNumber(""); setOpeningBalance(""); setErrors({});
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrors({});
    const result = await createAccount({
      name, account_type: accountType, bank_name: bankName || undefined,
      account_number: accountNumber || undefined,
      opening_balance: openingBalance ? Number(openingBalance) : 0,
    });
    if (!result.ok) { setErrors(result.errors); setLoading(false); return; }
    resetForm(); setLoading(false); router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kas & Bank</h1>
        {!showForm && (
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>+ Tambah Akun</Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-md border p-4 space-y-3 max-w-lg">
          <h2 className="font-semibold">Tambah Akun Kas/Bank</h2>
          {errors._form && <p className="text-sm text-red-600">{errors._form}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">Nama</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" required />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="account_type" className="text-sm font-medium">Tipe</label>
              <select id="account_type" value={accountType}
                onChange={(e) => setAccountType(e.target.value as "cash" | "bank")}
                className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="cash">Kas</option>
                <option value="bank">Bank</option>
              </select>
            </div>
          </div>
          {accountType === "bank" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="bank_name" className="text-sm font-medium">Nama Bank</label>
                <input id="bank_name" value={bankName} onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <label htmlFor="account_number" className="text-sm font-medium">No. Rekening</label>
                <input id="account_number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="opening_balance" className="text-sm font-medium">Saldo Awal</label>
            <input id="opening_balance" type="number" value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
            <Button type="button" size="sm" variant="outline" onClick={resetForm}>Batal</Button>
          </div>
        </form>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>No. Rekening</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[80px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Belum ada akun kas/bank.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((item) => (
                <TableRow key={item.$id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell><Badge variant="outline">{item.account_type === "cash" ? "Kas" : "Bank"}</Badge></TableCell>
                  <TableCell className="text-xs">{item.bank_name || "-"}</TableCell>
                  <TableCell className="text-xs">{item.account_number || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/cash-bank/${item.$id}`}>Detail</Link>
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
