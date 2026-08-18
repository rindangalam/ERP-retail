"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { _createPurchaseReturn } from "../actions";
import type { GRForPR } from "@/lib/purchase-return";

type Props = {
  grs: GRForPR[];
};

export function PurchaseReturnForm({ grs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [selectedGRId, setSelectedGRId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [purchaseOrderId, setPurchaseOrderId] = useState<string>("");
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    { product_id: string; qty: number; unit_price: number; max_qty: number }[]
  >([]);

  function handleGRChange(grId: string) {
    const gr = grs.find((g) => g.$id === grId);
    if (!gr) return;
    setSelectedGRId(grId);
    setPurchaseOrderId(gr.purchase_order_id ?? "");
    setSupplierId(gr.supplier_id);

    setItems(
      gr.items.map((item) => ({
        product_id: item.product_id,
        qty: 0,
        unit_price: item.unit_price,
        max_qty: item.quantity_received,
      }))
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!selectedGRId) {
      setFieldErrors({ gr_id: "Pilih GR." });
      return;
    }
    if (!supplierId) {
      setFieldErrors({ supplier_id: "Supplier tidak ditemukan." });
      return;
    }

    const filteredItems = items.filter((item) => item.qty > 0);
    if (filteredItems.length === 0) {
      setFieldErrors({ items: "Minimal satu item harus di-retur." });
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("supplier_id", supplierId);
    formData.set("purchase_order_id", purchaseOrderId);
    formData.set(
      "items",
      JSON.stringify(
        filteredItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.qty,
          unit_price: item.unit_price,
        }))
      )
    );

    const result = await _createPurchaseReturn(formData);
    if (!result.ok) {
      if (result.errors) {
        setFieldErrors(result.errors);
      } else {
        setFormError("Gagal menyimpan PR.");
      }
      return;
    }
    startTransition(() => router.push("/purchase-returns"));
  }

  return (
    <form onSubmit={handleSubmit}>
      {formError && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
      <Card>
        <CardHeader>
          <CardTitle>Form Purchase Return</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="gr_id">Goods Receipt *</Label>
            <select
              id="gr_id"
              name="gr_id"
              value={selectedGRId}
              onChange={(e) => handleGRChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Pilih GR</option>
              {grs.map((gr) => (
                <option key={gr.$id} value={gr.$id}>
                  {gr.gr_number} — {gr.po_number}
                </option>
              ))}
            </select>
            {fieldErrors.gr_id && <p className="text-sm text-red-500">{fieldErrors.gr_id}</p>}
          </div>

          <div>
            <Label htmlFor="return_date">Tanggal Retur *</Label>
            <Input
              type="date"
              id="return_date"
              name="return_date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
            {fieldErrors.return_date && <p className="text-sm text-red-500">{fieldErrors.return_date}</p>}
          </div>

          <div>
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {items.length > 0 && (
            <div>
              <Label>Items</Label>
              <table className="w-full border-collapse text-sm mt-2">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Produk</th>
                    <th className="p-2 text-right">Qty Diterima</th>
                    <th className="p-2 text-right">Harga Satuan</th>
                    <th className="p-2 text-right">Qty Retur</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.product_id} className="border-b">
                      <td className="p-2">{item.product_id}</td>
                      <td className="p-2 text-right">{item.max_qty}</td>
                      <td className="p-2 text-right">{item.unit_price.toLocaleString("id-ID")}</td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={item.max_qty}
                          value={item.qty}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].qty = Number(e.target.value);
                            setItems(newItems);
                          }}
                          className="w-24 text-right ml-auto"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fieldErrors.items && <p className="text-sm text-red-500">{fieldErrors.items}</p>}
            </div>
          )}

          {fieldErrors.supplier_id && <p className="text-sm text-red-500">{fieldErrors.supplier_id}</p>}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => router.push("/purchase-returns")} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
