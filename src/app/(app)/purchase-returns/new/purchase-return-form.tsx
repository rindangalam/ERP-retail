"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { _createPurchaseReturn } from "../actions";
import type { GRForPR } from "@/lib/purchase-return";
import type { ProductVariant } from "@/lib/variants";

type Props = {
  grs: GRForPR[];
  variantsByProduct: Record<string, ProductVariant[]>;
};

type PRRow = {
  gr_item_id: string;
  product_id: string;
  product_variant_id: string | null;
  qty: number;
  unit_price: number;
  max_qty: number;
};

// Label dropdown varian: SIZE · Warna · SKU · stok (pola pos-client).
function variantLabel(v: ProductVariant): string {
  const parts = [v.size?.trim(), v.color?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : v.sku;
}

// Varian prefill dikunci: label baca-saja via variantLabel + rowVariantText.

export function PurchaseReturnForm({ grs, variantsByProduct }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [selectedGRId, setSelectedGRId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [purchaseOrderId, setPurchaseOrderId] = useState<string>("");
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PRRow[]>([]);

  const variantById = useMemo(() => {
    const map = new Map<string, ProductVariant>();
    for (const vs of Object.values(variantsByProduct)) {
      for (const v of vs) map.set(v.$id, v);
    }
    return map;
  }, [variantsByProduct]);

  function rowVariantText(item: PRRow): string {
    if (!item.product_variant_id) return "—";
    const v = variantById.get(item.product_variant_id);
    return v ? variantLabel(v) : item.product_variant_id;
  }

  function handleGRChange(grId: string) {
    const gr = grs.find((g) => g.$id === grId);
    if (!gr) return;
    setSelectedGRId(grId);
    setPurchaseOrderId(gr.purchase_order_id ?? "");
    setSupplierId(gr.supplier_id);

    setItems(
      gr.items.map((item) => ({
        gr_item_id: item.$id,
        product_id: item.product_id,
        // Bawa varian dari GR asal; null untuk GR lama tanpa varian.
        product_variant_id: item.product_variant_id ?? null,
        qty: 0,
        unit_price: item.unit_price,
        max_qty: item.quantity_received,
      }))
    );
  }

  // Varian dikunci mengikuti GR asal (prefill): tidak ada pengubahan via UI.
  // Bila state inkonsisten (produk bervarian tanpa varian), submit menolak
  // dengan pesan Bahasa Indonesia di bawah.

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
    // Produk bervarian wajib kirim varian; produk polos kirim null.
    const missingVariant = filteredItems.some(
      (item) => (variantsByProduct[item.product_id]?.length ?? 0) > 0 && !item.product_variant_id
    );
    if (missingVariant) {
      setFieldErrors({ items: "Pilih varian untuk tiap produk bervarian." });
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
          product_variant_id: item.product_variant_id ?? null,
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
      {formError && <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>}
      <div className="space-y-4 max-w-2xl">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Form Purchase Return</h1>
        </div>
        <div>
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
            {fieldErrors.gr_id && <p className="text-sm text-destructive">{fieldErrors.gr_id}</p>}
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
            {fieldErrors.return_date && <p className="text-sm text-destructive">{fieldErrors.return_date}</p>}
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
                    <th className="p-2 text-right">Qty Diterima</th>
                    <th className="p-2 text-right">Harga Satuan</th>
                    <th className="p-2 text-right">Qty Retur</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    return (
                      <tr key={item.gr_item_id} className="border-b">
                        <td className="p-2">{item.product_id}</td>
                        <td className="p-2">
                          {/* Prefill: varian dikunci ke nilai GR asal. Produk polos → null/—. */}
                          <span className="text-muted-foreground">{rowVariantText(item)}</span>
                          <input type="hidden" value={item.product_variant_id ?? ""} aria-hidden="true" tabIndex={-1} readOnly />
                        </td>
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
                    );
                  })}
                </tbody>
              </table>
              {fieldErrors.items && <p className="text-sm text-destructive">{fieldErrors.items}</p>}
            </div>
          )}

          {fieldErrors.supplier_id && <p className="text-sm text-destructive">{fieldErrors.supplier_id}</p>}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => router.push("/purchase-returns")} disabled={isPending}>
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
