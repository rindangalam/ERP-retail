"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Product } from "@/lib/inventory";
import type { Customer } from "@/lib/customer";
import { type SalesOrderActionState } from "../actions";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

type ItemRow = {
  key: string;
  product_id: string;
  quantity: number;
  unit_price: number;
};

type SalesOrderFormProps = {
  customers: Customer[];
  products: Product[];
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SalesOrderForm({ customers, products }: SalesOrderFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<ItemRow[]>([
    { key: crypto.randomUUID(), product_id: "", quantity: 1, unit_price: 0 },
  ]);
  const [state, setState] = useState<SalesOrderActionState>(undefined);
  const [pending, setPending] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    if (state?.ok && !submitted.current) {
      submitted.current = true;
      router.push("/sales-orders");
      const timer = setTimeout(() => {
        submitted.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  const totalAmount = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
    0
  );

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), product_id: "", quantity: 1, unit_price: 0 },
    ]);
  };

  const removeRow = (key: string) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.key !== key)));
  };

  const updateRow = (key: string, patch: Partial<ItemRow>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = items.map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
    }));
    const form = new FormData();
    for (const [key, value] of formData.entries()) {
      form.set(key, value);
    }
    form.set("items", JSON.stringify(payload));
    setPending(true);
    const next = await import("../actions").then((m) => m.createSalesOrderAction(undefined, form));
    setPending(false);
    setState(next);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Buat Sales Order</h1>
        <p className="text-sm text-muted-foreground">
          Buat order penjualan ke customer.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-md border p-4">
        <div className="space-y-2">
          <Label htmlFor="customer_id">Customer</Label>
          <select
            id="customer_id"
            name="customer_id"
            required
            className={SELECT_CLASS}
            defaultValue=""
          >
            <option value="">Pilih customer</option>
            {customers
              .filter((c) => c.is_active)
              .map((customer) => (
                <option key={customer.$id} value={customer.$id}>
                  {customer.code} — {customer.name}
                </option>
              ))}
          </select>
          {state?.errors?.customer_id ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.customer_id}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="order_date">Tanggal Order</Label>
          <Input id="order_date" name="order_date" type="date" defaultValue={today()} required />
          {state?.errors?.order_date ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.order_date}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="expected_date">Tanggal perkiraan kirim</Label>
          <Input id="expected_date" name="expected_date" type="date" />
          {state?.errors?.expected_date ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.expected_date}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Catatan</Label>
          <Input id="notes" name="notes" placeholder="Opsional" />
          {state?.errors?.notes ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.notes}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">Produk</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Harga satuan</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              return (
                <TableRow key={item.key}>
                  <TableCell>
                    <select
                      aria-label="Produk"
                      required
                      className={SELECT_CLASS}
                      value={item.product_id}
                      onChange={(e) => updateRow(item.key, { product_id: e.target.value })}
                    >
                      <option value="">Pilih produk</option>
                      {products
                        .filter((p) => p.is_active)
                        .map((p) => (
                          <option key={p.$id} value={p.$id}>
                            {p.sku} — {p.name}
                          </option>
                        ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label="Quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => updateRow(item.key, { quantity: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label="Harga satuan"
                      type="number"
                      min="0"
                      step="1"
                      value={item.unit_price}
                      onChange={(e) => updateRow(item.key, { unit_price: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => removeRow(item.key)}
                    >
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={addRow}>
          Tambah item
        </Button>
        <div className="flex items-center gap-6">
          <div className="text-sm text-muted-foreground">
            Total item: <span className="font-medium text-foreground">{items.length}</span>
          </div>
          <div className="text-lg font-semibold tabular-nums">
            {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      {state?.message && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">{state.message}</p>
      ) : null}
      {state?.errors?.items ? (
        <p role="alert" className="text-sm text-destructive">{state.errors.items}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/sales-orders")}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan SO"}
        </Button>
      </div>
    </form>
  );
}
