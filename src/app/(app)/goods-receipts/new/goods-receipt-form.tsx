"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { _createGoodsReceipt } from "../actions";
import type { PurchaseOrderWithItems } from "@/lib/purchase-order";
import type { ProductVariant } from "@/lib/variants";

type Props = {
  pos: PurchaseOrderWithItems[];
  variantsByProduct: Record<string, ProductVariant[]>;
};

type GRRow = {
  purchase_order_item_id: string;
  product_id: string;
  product_variant_id: string | null;
  qty: number;
  po_qty: number;
};

// Label dropdown varian: SIZE · Warna · SKU · stok (pola pos-client).
function variantOptionLabel(v: ProductVariant): string {
  const parts = [v.size?.trim(), v.color?.trim()].filter(Boolean);
  const head = parts.length > 0 ? parts.join(" / ") : v.sku;
  return `${head} · ${v.sku} · stok ${Number(v.current_stock)}`;
}

export function GoodsReceiptForm({ pos, variantsByProduct }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [selectedPOId, setSelectedPOId] = useState<string>("");
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<GRRow[]>([]);

  function handlePOChange(poId: string) {
    const po = pos.find((p) => p.$id === poId);
    if (!po) return;
    setSelectedPOId(poId);
    setItems(
      po.items.map((item) => ({
        purchase_order_item_id: item.$id,
        product_id: item.product_id,
        product_variant_id: null,
        qty: 0,
        po_qty: item.quantity,
      }))
    );
  }

  function updateVariant(idx: number, variantId: string) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, product_variant_id: variantId || null } : item)));
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

    const received = items.filter((item) => item.qty > 0);
    if (received.length === 0) {
      setFieldErrors({ items: "Minimal satu item dengan qty > 0." });
      return;
    }
    // Produk bervarian wajib pilih varian; produk polos kirim null.
    const missingVariant = received.some(
      (item) => (variantsByProduct[item.product_id]?.length ?? 0) > 0 && !item.product_variant_id
    );
    if (missingVariant) {
      setFieldErrors({ items: "Pilih varian untuk tiap produk bervarian." });
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("purchase_order_id", selectedPOId);
    formData.set(
      "items",
      JSON.stringify(
        received.map((item) => ({
          purchase_order_item_id: item.purchase_order_item_id,
          product_id: item.product_id,
          product_variant_id: item.product_variant_id ?? null,
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
      {formError && <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>}
      <div className="space-y-4 max-w-2xl">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Form Goods Receipt</h1>
        </div>
        <div>
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
            {fieldErrors.purchase_order_id && <p className="text-sm text-destructive">{fieldErrors.purchase_order_id}</p>}
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
            {fieldErrors.received_date && <p className="text-sm text-destructive">{fieldErrors.received_date}</p>}
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
                    <th className="p-2 text-left">Varian</th>
                    <th className="p-2 text-right">Qty PO</th>
                    <th className="p-2 text-right">Qty Diterima</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const variants = variantsByProduct[item.product_id] ?? [];
                    return (
                      <tr key={item.purchase_order_item_id} className="border-b">
                        <td className="p-2">{item.product_id}</td>
                        <td className="p-2">
                          {variants.length > 0 ? (
                            <select
                              value={item.product_variant_id ?? ""}
                              onChange={(e) => updateVariant(idx, e.target.value)}
                              className="flex h-9 w-full min-w-40 rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                              aria-label={`Varian untuk ${item.product_id}`}
                            >
                              <option value="">Pilih varian</option>
                              {variants.map((v) => (
                                <option key={v.$id} value={v.$id}>
                                  {variantOptionLabel(v)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
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
                    );
                  })}
                </tbody>
              </table>
              {fieldErrors.items && <p className="text-sm text-destructive">{fieldErrors.items}</p>}
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
        </div>
      </div>
    </form>
  );
}
