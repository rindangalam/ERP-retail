"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { InvoiceForReturn } from "@/lib/sales-return";
import { createReturn } from "../actions";

type Props = { invoices: InvoiceForReturn[] };

type ReturnItem = { product_id: string; quantity: number; unit_price: number; sales_invoice_item_id: string };

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export function SalesReturnForm({ invoices }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState("");
  const [returnDate, setReturnDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState("");
  const [items, setItems] = React.useState<ReturnItem[]>([]);

  const selectedInvoice = invoices.find((i) => i.$id === selectedInvoiceId);

  const handleInvoiceChange = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    const inv = invoices.find((i) => i.$id === invoiceId);
    if (inv) {
      setItems(inv.items.map((item) => ({
        product_id: item.product_id,
        quantity: 0,
        unit_price: item.unit_price,
        sales_invoice_item_id: item.sales_invoice_item_id,
      })));
    } else {
      setItems([]);
    }
  };

  const updateItemQty = (index: number, qty: number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  };

  const filteredItems = items.filter((item) => item.quantity > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) { setErrors({ sales_invoice_id: "Wajib dipilih." }); return; }
    if (filteredItems.length === 0) { setErrors({ items: "Minimal 1 item dengan qty > 0." }); return; }
    setLoading(true);
    setErrors({});
    const result = await createReturn({
      sales_invoice_id: selectedInvoiceId,
      return_date: returnDate,
      notes: notes || undefined,
      items: filteredItems,
    });
    if (!result.ok) { setErrors(result.errors); setLoading(false); return; }
    router.push("/sales-returns");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      {errors._form && <p className="text-sm text-red-600">{errors._form}</p>}

      <div className="space-y-1">
        <label htmlFor="invoice" className="text-sm font-medium">Invoice</label>
        <select
          id="invoice"
          value={selectedInvoiceId}
          onChange={(e) => handleInvoiceChange(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">-- Pilih Invoice --</option>
          {invoices.map((inv) => (
            <option key={inv.$id} value={inv.$id}>
              {inv.invoice_number} — {inv.customer_name} ({fmtCurrency(inv.total_amount)})
            </option>
          ))}
        </select>
        {errors.sales_invoice_id && <p className="text-xs text-red-600">{errors.sales_invoice_id}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="return_date" className="text-sm font-medium">Tanggal Retur</label>
        <input id="return_date" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm" required />
        {errors.return_date && <p className="text-xs text-red-600">{errors.return_date}</p>}
      </div>

      {selectedInvoice && items.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-medium">Produk</th>
                <th className="px-3 py-2 text-right font-medium">Qty Invoice</th>
                <th className="px-3 py-2 text-right font-medium">Harga</th>
                <th className="px-3 py-2 text-right font-medium">Qty Retur</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const invItem = selectedInvoice.items.find((ii) => ii.product_id === item.product_id);
                return (
                  <tr key={item.product_id} className="border-b last:border-0">
                    <td className="px-3 py-2">{invItem?.product_id ?? item.product_id}</td>
                    <td className="px-3 py-2 text-right">{invItem?.quantity ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{fmtCurrency(item.unit_price)}</td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" min="0" max={invItem?.quantity ?? 999} value={item.quantity}
                        onChange={(e) => updateItemQty(i, parseInt(e.target.value) || 0)}
                        className="w-20 rounded border px-2 py-1 text-right text-sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {errors.items && <p className="text-xs text-red-600">{errors.items}</p>}

      <div className="space-y-1">
        <label htmlFor="notes" className="text-sm font-medium">Catatan</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm" rows={2} placeholder="Opsional" />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Buat Retur"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/sales-returns")}>Batal</Button>
      </div>
    </form>
  );
}
