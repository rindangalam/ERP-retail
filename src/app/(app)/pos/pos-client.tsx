"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/lib/inventory";
import type { ProductVariant } from "@/lib/variants";
import { quickSaleAction } from "./actions";

type PosClientProps = {
  products: Product[];
  variantsByProduct: Record<string, ProductVariant[]>;
};

type CartLine = {
  key: string;
  product_id: string;
  product_variant_id: string | null;
  name: string;
  variant_label: string | null;
  sku: string;
  stock: number;
  quantity: number;
  unit_price: number;
};

type SuccessInfo = {
  invoice_number: string;
  change: number;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function variantLabel(v: ProductVariant): string {
  const parts = [v.size?.trim(), v.color?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : v.sku;
}

function defaultPrice(product: Product, variant: ProductVariant | null): number {
  if (variant?.sell_price !== null && variant?.sell_price !== undefined) return variant.sell_price;
  return product.sell_price;
}

function lineStock(product: Product, variant: ProductVariant | null): number {
  return variant ? Number(variant.current_stock) : Number(product.current_stock);
}

export function PosClient({ products, variantsByProduct }: PosClientProps) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<"cash" | "bank_transfer">("cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [pendingInvoice, setPendingInvoice] = useState<{
    invoice_number: string;
    invoice_id: string;
  } | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? products.filter((p) => {
          const variants = variantsByProduct[p.$id] ?? [];
          const haystacks = [
            p.name.toLowerCase(),
            p.sku.toLowerCase(),
            (p.barcode ?? "").toLowerCase(),
            ...variants.flatMap((v) => [v.sku.toLowerCase(), (v.barcode ?? "").toLowerCase()]),
          ];
          return haystacks.some((h) => h.includes(q));
        })
      : products;
    return matched.slice(0, 50);
  }, [products, variantsByProduct, query]);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity * line.unit_price, 0),
    [cart],
  );
  const safeDiscount = Number.isFinite(discount) && discount > 0 ? discount : 0;
  const total = Math.max(0, subtotal - safeDiscount);
  const effectiveCash = method === "bank_transfer" ? total : cashReceived;
  const change = effectiveCash - total;

  function addLine(product: Product, variant: ProductVariant | null) {
    const key = `${product.$id}__${variant?.$id ?? ""}`;
    setErrors({});
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key,
          product_id: product.$id,
          product_variant_id: variant?.$id ?? null,
          name: product.name,
          variant_label: variant ? variantLabel(variant) : null,
          sku: variant ? variant.sku : product.sku,
          stock: lineStock(product, variant),
          quantity: 1,
          unit_price: defaultPrice(product, variant),
        },
      ];
    });
  }

  function handleResultClick(product: Product) {
    const variants = variantsByProduct[product.$id] ?? [];
    if (variants.length === 0) {
      addLine(product, null);
      return;
    }
    setExpandedId((prev) => (prev === product.$id ? null : product.$id));
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev.map((l) =>
        l.key === key ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l,
      ),
    );
  }

  function updatePrice(key: string, value: number) {
    setCart((prev) =>
      prev.map((l) =>
        l.key === key ? { ...l, unit_price: Number.isFinite(value) && value >= 0 ? value : 0 } : l,
      ),
    );
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  function resetAll() {
    setCart([]);
    setDiscount(0);
    setMethod("cash");
    setCashReceived(0);
    setErrors({});
    setSuccess(null);
    setPendingInvoice(null);
    setQuery("");
    setExpandedId(null);
  }

  async function handlePay() {
    setSubmitting(true);
    setErrors({});
    setPendingInvoice(null);
    try {
      const result = await quickSaleAction({
        items: cart.map((l) => ({
          product_id: l.product_id,
          product_variant_id: l.product_variant_id,
          quantity: l.quantity,
          unit_price: l.unit_price,
        })),
        payment_method: method,
        cash_received: effectiveCash,
        discount: safeDiscount,
      });
      if (result.ok) {
        setSuccess({ invoice_number: result.invoice_number, change: result.change });
      } else {
        setErrors(result.errors);
        // Payment gagal pasca-posting: invoice posted-unpaid yatim. Keranjang
        // SENGAJA tidak direset agar kasir memilih lunasi atau batalkan.
        if (result.invoice_number && result.invoice_id) {
          setPendingInvoice({
            invoice_number: result.invoice_number,
            invoice_id: result.invoice_id,
          });
        }
      }
    } catch {
      setErrors({
        _form: "Jaringan bermasalah. Periksa dulu daftar invoice sebelum mengulang pembayaran.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const errorMessages = Object.values(errors);
  const payDisabled = cart.length === 0 || submitting || total <= 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Kolom kiri: pencarian produk */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Cari Produk</h2>
          <p className="text-sm text-muted-foreground">
            Cari berdasarkan SKU, nama, atau barcode (termasuk SKU varian).
          </p>
        </div>
        <Input
          placeholder="Ketik SKU / nama / barcode…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="space-y-2">
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground">Produk tidak ditemukan.</p>
          )}
          {results.map((product) => {
            const variants = variantsByProduct[product.$id] ?? [];
            const expanded = expandedId === product.$id;
            return (
              <div key={product.$id} className="rounded-lg border p-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left"
                  onClick={() => handleResultClick(product)}
                >
                  <span>
                    <span className="block font-medium">{product.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {product.sku} · {formatCurrency(product.sell_price)} · Stok:{" "}
                      {Number(product.current_stock)}
                    </span>
                  </span>
                  {variants.length > 0 ? (
                    <Badge variant="secondary">{variants.length} varian</Badge>
                  ) : (
                    <Badge>Tambah</Badge>
                  )}
                </button>
                {variants.length > 0 && expanded && (
                  <div className="mt-2 space-y-1 border-t pt-2">
                    <p className="text-xs text-muted-foreground">Pilih varian dulu:</p>
                    {variants.map((v) => (
                      <button
                        key={v.$id}
                        type="button"
                        className="flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-sm hover:bg-muted"
                        onClick={() => addLine(product, v)}
                      >
                        <span>
                          {variantLabel(v)}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({v.sku} · Stok: {Number(v.current_stock)})
                          </span>
                        </span>
                        <span className="font-medium">
                          {formatCurrency(v.sell_price ?? product.sell_price)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Kolom kanan: keranjang + pembayaran */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Keranjang</h2>
          <p className="text-sm text-muted-foreground">
            Atur jumlah dan harga, lalu selesaikan pembayaran.
          </p>
        </div>

        {success ? (
          <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <h3 className="font-semibold text-green-800">Pembayaran berhasil!</h3>
            <p className="text-sm">
              Nomor invoice: <span className="font-mono font-semibold">{success.invoice_number}</span>
            </p>
            <p className="text-sm">
              Kembalian: <span className="font-semibold">{formatCurrency(success.change)}</span>
            </p>
            <Button onClick={resetAll}>Transaksi Baru</Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {cart.length === 0 && (
                <p className="text-sm text-muted-foreground">Keranjang masih kosong.</p>
              )}
              {cart.map((line) => (
                <div key={line.key} className="space-y-1 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{line.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.variant_label ? `${line.variant_label} · ` : ""}
                        {line.sku} · Stok: {line.stock}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeLine(line.key)}>
                      Hapus
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQty(line.key, -1)}
                      disabled={line.quantity <= 1}
                    >
                      −
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
                    <Button variant="outline" size="sm" onClick={() => updateQty(line.key, 1)}>
                      +
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      className="ml-auto w-36"
                      value={line.unit_price}
                      onChange={(e) => updatePrice(line.key, Number(e.target.value))}
                      aria-label={`Harga ${line.name}`}
                    />
                  </div>
                  <p className="text-right text-sm font-medium">
                    {formatCurrency(line.quantity * line.unit_price)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="pos-discount" className="text-sm">
                  Diskon nota (Rp)
                </label>
                <Input
                  id="pos-discount"
                  type="number"
                  min={0}
                  className="w-36"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Metode pembayaran</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={method === "cash" ? "default" : "outline"}
                  onClick={() => setMethod("cash")}
                >
                  Tunai
                </Button>
                <Button
                  type="button"
                  variant={method === "bank_transfer" ? "default" : "outline"}
                  onClick={() => setMethod("bank_transfer")}
                >
                  Transfer
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="pos-cash" className="text-sm">
                  {method === "cash" ? "Tunai diterima (Rp)" : "Nominal transfer (Rp)"}
                </label>
                <Input
                  id="pos-cash"
                  type="number"
                  min={0}
                  className="w-36"
                  value={method === "bank_transfer" ? total : cashReceived}
                  disabled={method === "bank_transfer"}
                  onChange={(e) => setCashReceived(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Kembalian</span>
                <span className="font-semibold">{formatCurrency(Math.max(0, change))}</span>
              </div>
            </div>

            {errorMessages.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <ul className="list-disc space-y-1 pl-5">
                  {errorMessages.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
                {pendingInvoice && (
                  <p className="mt-2">
                    Invoice {pendingInvoice.invoice_number} sudah posted tapi belum lunas.{" "}
                    <Link
                      className="font-semibold underline"
                      href={`/sales-invoices/${pendingInvoice.invoice_id}/pay`}
                    >
                      Lunasi di halaman invoice
                    </Link>{" "}
                    — keranjang dibiarkan agar kasir bisa memilih lunasi atau batalkan.
                  </p>
                )}
              </div>
            )}

            <Button className="w-full" disabled={payDisabled} onClick={handlePay}>
              {submitting ? "Memproses…" : `Bayar ${formatCurrency(total)}`}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
