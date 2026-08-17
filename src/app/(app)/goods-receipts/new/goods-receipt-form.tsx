"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { _createGoodsReceipt } from "../actions";
import type { PurchaseOrderWithItems } from "@/lib/purchase-order";

type Props = {
  pos: PurchaseOrderWithItems[];
};

export function GoodsReceiptForm({ pos }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [selectedPOId, setSelectedPOId] = useState<string>("");
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    { purchase_order_item_id: string; product_id: string; qty: number; po_qty: number }[]
  >([]);

  function handlePOChange(poId: string) {
    const po = pos.find((p) => p.$id === poId);
    if (!po) return;
    setSelectedPOId(poId);
    setItems(
      po.items.map((item) => ({
        purchase_order_item_id: item.$id,
        product_id: item.product_id,
        qty: 0,
        po_qty: item.quantity,
      }))
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!selectedPOId) {
      setFieldErrors({ purchase_order_id: "Pilih PO." });
      return;
    }
    if (items.length === 0) {
      setFieldErrors({ items: "Tidak ada item." });
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("purchase_order_id", selectedPOId);
    formData.set(
      "items",
      JSON.stringify(
        items
          .filter((item) => item.qty > 0)
          .map((item) => ({
            purchase_order_item_id: item.purchase_order_item_id,
            product_id: item.product_id,
            quantity_received: item.qty,
          }))
      )
    );

    const result = await _createGoodsReceipt(formData);
    if (!result.ok) {
      if (result.errors) {
        setFieldErrors(result.errors);
      } else {
        setFormError("Gagal menyimpan GR.");
      }
      return;
    }
    startTransition(() => router.push("/goods-receipts"));
  }

  return (
    <form onSubmit={handleSubmit}>
      {formError && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
      <Card>
        <CardHeader>
          <CardTitle>Form Goods Receipt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="purchase_order_id">Purchase Order *</Label>
            <select
              id="purchase_order_id"
              name="purchase_order_id"
              value={selectedPOId}
              onChange={(e) => handlePOChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Pilih PO</option>
              {pos.map((po) => (
                <option key={po.$id} value={po.$id}>
                  {po.po_number} — {po.supplier_name}
                </option>
              ))}
            </select>
            {fieldErrors.purchase_order_id && <p className="text-sm text-red-500">{fieldErrors.purchase_order_id}</p>}
          </div>

          <div>
            <Label htmlFor="received_date">Tanggal Penerimaan *</Label>
            <Input
              type="date"
              id="received_date"
              name="received_date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
            />
            {fieldErrors.received_date && <p className="text-sm text-red-500">{fieldErrors.received_date}</p>}
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
                    <th className="p-2 text-right">Qty PO</th>
                    <th className="p-2 text-right">Qty Diterima</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.purchase_order_item_id} className="border-b">
                      <td className="p-2">{item.product_id}</td>
                      <td className="p-2 text-right">{item.po_qty}</td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={item.po_qty}
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => router.push("/goods-receipts")} disabled={isPending}>
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
