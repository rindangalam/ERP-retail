"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import type { CashBankAccount, CashBankTransaction } from "@/lib/cash-bank";
import { addTransaction } from "../actions";

type Props = {
  account: CashBankAccount;
  transactions: CashBankTransaction[];
  balance: number;
};

export function CashBankDetailClient({ account, transactions, balance }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [txnDate, setTxnDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [txnType, setTxnType] = React.useState<"in" | "out">("in");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");

  const resetForm = () => {
    setTxnDate(new Date().toISOString().slice(0, 10));
    setTxnType("in"); setAmount(""); setDescription(""); setErrors({});
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrors({});
    const result = await addTransaction({
      cash_bank_account_id: account.$id,
      transaction_date: txnDate,
      transaction_type: txnType,
      amount: Number(amount),
      description,
    });
    if (!result.ok) { setErrors(result.errors); setLoading(false); return; }
    resetForm(); setLoading(false); router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{account.name}</h1>
            <Badge variant="outline">{account.account_type === "cash" ? "Kas" : "Bank"}</Badge>
          </div>
          {account.bank_name && (
            <p className="text-sm text-muted-foreground">{account.bank_name} — {account.account_number}</p>
          )}
        </div>
        <div className="flex gap-2">
          {!showForm && (
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>+ Transaksi</Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <Link href="/cash-bank">← Kembali</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-md border p-4 max-w-sm">
        <span className="text-sm text-muted-foreground">Saldo Saat Ini</span>
        <p className="text-2xl font-bold">{balance.toLocaleString("id-ID")}</p>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-md border p-4 space-y-3 max-w-lg">
          <h2 className="font-semibold">Catat Transaksi</h2>
          {errors._form && <p className="text-sm text-red-600">{errors._form}</p>}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="txn_date" className="text-sm font-medium">Tanggal</label>
              <input id="txn_date" type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-1">
              <label htmlFor="txn_type" className="text-sm font-medium">Tipe</label>
              <select id="txn_type" value={txnType}
                onChange={(e) => setTxnType(e.target.value as "in" | "out")}
                className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="in">Masuk (+)</option>
                <option value="out">Keluar (-)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="amount" className="text-sm font-medium">Jumlah</label>
              <input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm" required min="1" />
              {errors.amount && <p className="text-xs text-red-600">{errors.amount}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="description" className="text-sm font-medium">Keterangan</label>
            <input id="description" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm" required />
            {errors.description && <p className="text-xs text-red-600">{errors.description}</p>}
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
              <TableHead className="w-[110px]">Tanggal</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right w-[120px]">Masuk (+)</TableHead>
              <TableHead className="text-right w-[120px]">Keluar (-)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Belum ada transaksi.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((txn) => (
                <TableRow key={txn.$id}>
                  <TableCell className="text-xs">{txn.transaction_date}</TableCell>
                  <TableCell>
                    <Badge variant={txn.transaction_type === "in" ? "default" : "destructive"}>
                      {txn.transaction_type === "in" ? "Masuk" : "Keluar"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{txn.description}</TableCell>
                  <TableCell className="text-right text-xs">
                    {txn.transaction_type === "in" ? txn.amount.toLocaleString("id-ID") : "-"}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {txn.transaction_type === "out" ? txn.amount.toLocaleString("id-ID") : "-"}
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
