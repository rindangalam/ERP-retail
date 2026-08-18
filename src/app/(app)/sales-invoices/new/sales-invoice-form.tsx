"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createInvoice } from "../actions";

type SOItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sales_order_item_id: string;
};

type SO = {
  $id: string;
  so_number: string;
  customer_id: string;
  customer_name: string;
  total_amount: number;
  items: SOItem[];
};

type Props = {
  confirmedSOs: SO[];
};

type FormItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
  sales_order_item_id: string;
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function SalesInvoiceForm({ confirmedSOs }: Props) {
  const router = useRouter();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const [selectedSOId, setSelectedSOId] = React.useState("");
  const [invoiceDate, setInvoiceDate] = React.useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [dueDate, setDueDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [discount, setDiscount] = React.useState("");
  const [tax, setTax] = React.useState("");
  const [stockOverride, setStockOverride] = React.useState(false);
  const [overrideNote, setOverrideNote] = React.useState("");
  const [items, setItems] = React.useState<FormItem[]>([]);

  const selectedSO = confirmedSOs.find((so) => so.$id === selectedSOId);

  const handleSOChange = (soId: string) => {
    setSelectedSOId(soId);
    const so = confirmedSOs.find((s) => s.$id === soId);
    if (so) {
      setItems(
        so.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          sales_order_item_id: item.sales_order_item_id,
        }))
      );
    } else {
      setItems([]);
    }
    setErrors({});
  };

  const updateItem = (idx: number, field: keyof FormItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, [field]: field === "quantity" || field === "unit_price" ? Number(value) || 0 : value } : item
      )
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discountNum = Number(discount) || 0;
  const taxNum = Number(tax) || 0;
  const total = subtotal - discountNum + taxNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    if (!selectedSOId) {
      setErrors({ sales_order_id: "Pilih Sales Order." });
      setSubmitting(false);
      return;
    }
    if (items.length === 0) {
      setErrors({ items: "Tidak ada item." });
      setSubmitting(false);
      return;
    }

    const result = await createInvoice({
      sales_order_id: selectedSOId,
      customer_id: selectedSO?.customer_id ?? "",
      invoice_date: invoiceDate,
      due_date: dueDate,
      discount: discountNum,
      tax: taxNum,
      stock_override: stockOverride || undefined,
      override_note: overrideNote || undefined,
      items,
    });

    if (!result.ok) {
      setErrors(result.errors);
      setSubmitting(false);
      return;
    }

    router.push("/sales-invoices");
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {errors._form && <p className="text-sm text-red-600">{errors._form}</p>}

      <div>
        <h1 className="text-xl font-semibold">Buat Invoice dari Sales Order</h1>
        <p className="text-muted-foreground text-sm mt-1">Pilih SO yang sudah dikonfirmasi untuk membuat invoice.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="so" className="text-sm font-medium">Sales Order</label>
          {confirmedSOs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada SO dikonfirmasi.</p>
          ) : (
            <select
              id="so"
              value={selectedSOId}
              onChange={(e) => handleSOChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Pilih Sales Order...</option>
              {confirmedSOs.map((so) => (
                <option key={so.$id} value={so.$id}>
                  {so.so_number} — {so.customer_name} ({fmtCurrency(so.total_amount)})
                </option>
              ))}
            </select>
          )}
          {errors.sales_order_id && <p className="text-xs text-red-600">{errors.sales_order_id}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Customer</label>
          <Input value={selectedSO?.customer_name ?? ""} disabled placeholder="—" />
        </div>

        <div className="space-y-2">
          <label htmlFor="invoice_date" className="text-sm font-medium">Tanggal Invoice</label>
          <Input id="invoice_date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label htmlFor="due_date" className="text-sm font-medium">Jatuh Tempo</label>
          <Input id="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label htmlFor="discount" className="text-sm font-medium">Diskon (Rp)</label>
          <Input id="discount" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
          {errors.discount && <p className="text-xs text-red-600">{errors.discount}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="tax" className="text-sm font-medium">Pajak (Rp)</label>
          <Input id="tax" type="number" min="0" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="0" />
          {errors.tax && <p className="text-xs text-red-600">{errors.tax}</p>}
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Item Invoice</label>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left">Produk ID</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Harga Satuan</th>
                  <th className="p-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 font-mono text-xs">{item.product_id}</td>
                    <td className="p-2 text-right">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        className="w-20 text-right h-8"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <Input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
                        className="w-32 text-right h-8"
                      />
                    </td>
                    <td className="p-2 text-right">{fmtCurrency(item.quantity * item.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td colSpan={3} className="p-2 text-right">Subtotal</td>
                  <td className="p-2 text-right">{fmtCurrency(subtotal)}</td>
                </tr>
                {discountNum > 0 && (
                  <tr className="text-muted-foreground">
                    <td colSpan={3} className="p-2 text-right">Diskon</td>
                    <td className="p-2 text-right">-{fmtCurrency(discountNum)}</td>
                  </tr>
                )}
                {taxNum > 0 && (
                  <tr className="text-muted-foreground">
                    <td colSpan={3} className="p-2 text-right">Pajak</td>
                    <td className="p-2 text-right">+{fmtCurrency(taxNum)}</td>
                  </tr>
                )}
                <tr className="border-t font-bold">
                  <td colSpan={3} className="p-2 text-right">Total</td>
                  <td className="p-2 text-right">{fmtCurrency(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {errors.items && <p className="text-xs text-red-600">{errors.items}</p>}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            id="stock_override"
            type="checkbox"
            checked={stockOverride}
            onChange={(e) => setStockOverride(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="stock_override" className="text-sm font-medium">Override Stok (abaikan stok tidak cukup)</label>
        </div>
        {stockOverride && (
          <div className="space-y-2">
            <label htmlFor="override_note" className="text-sm font-medium">Alasan Override</label>
            <Textarea
              id="override_note"
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              placeholder="Alasan override stok..."
            />
            {errors.override_note && <p className="text-xs text-red-600">{errors.override_note}</p>}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting || confirmedSOs.length === 0}>
          {submitting ? "Membuat..." : "Buat Invoice"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/sales-invoices")}>
          Batal
        </Button>
      </div>
    </form>
  );
}
