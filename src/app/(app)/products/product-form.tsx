"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductCategory, Product } from "@/lib/inventory";
import { createVariantAction, type ProductActionState } from "./actions";
import { useActionToast } from "@/lib/use-action-toast";

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "Semua Ukuran"];

function suggestVariantSku(parentSku: string, size: string, color: string): string {
  const parts = [parentSku, size, color]
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length === 0) return "";
  return parts
    .join("-")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function VariantSection({ product }: { product: Product }) {
  const router = useRouter();
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [sku, setSku] = useState("");
  const [skuManual, setSkuManual] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [minStock, setMinStock] = useState("0");

  const variantAction = async (prevState: ProductActionState, formData: FormData) => {
    const res = await createVariantAction(prevState, formData);
    if (res?.ok) {
      setSize("");
      setColor("");
      setSku("");
      setSkuManual(false);
      setBarcode("");
      setSellPrice("");
      setMinStock("0");
      router.refresh();
    }
    return res;
  };
  const [vState, vFormAction, vPending] = useActionState(variantAction, undefined);

  useActionToast(vState, "Varian dibuat");

  const suggestion = useMemo(
    () => suggestVariantSku(product.sku ?? "", size, color),
    [product.sku, size, color]
  );

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setSize(next);
    if (!skuManual) {
      setSku(suggestVariantSku(product.sku ?? "", next, color));
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setColor(next);
    if (!skuManual) {
      setSku(suggestVariantSku(product.sku ?? "", size, next));
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div>
        <h3 className="text-sm font-semibold">Varian</h3>
        <p className="text-xs text-muted-foreground">
          Tambah varian ukuran/warna. Stok varian hanya bisa dibaca di sini.
        </p>
      </div>
      <form action={vFormAction} className="space-y-3">
        <input type="hidden" name="product_id" value={product.$id} />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="variant-size" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ukuran</Label>
            <Input
              id="variant-size"
              name="size"
              value={size}
              onChange={handleSizeChange}
              placeholder="M"
              list="variant-size-preset"
              autoComplete="off"
            />
            <datalist id="variant-size-preset">
              {SIZE_PRESETS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {vState?.errors?.size ? (
              <p role="alert" className="text-xs text-destructive">{vState.errors.size}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="variant-color" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Warna</Label>
            <Input
              id="variant-color"
              name="color"
              value={color}
              onChange={handleColorChange}
              placeholder="Hitam"
              autoComplete="off"
            />
            {vState?.errors?.color ? (
              <p role="alert" className="text-xs text-destructive">{vState.errors.color}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="variant-sku" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">SKU varian</Label>
          <Input
            id="variant-sku"
            name="sku"
            value={sku}
            onChange={(e) => {
              setSku(e.target.value);
              setSkuManual(true);
            }}
            placeholder={suggestion || `${product.sku}-UKURAN-WARNA`}
          />
          {vState?.errors?.sku ? (
            <p role="alert" className="text-xs text-destructive">{vState.errors.sku}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="variant-barcode" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Barcode (opsional)</Label>
          <Input id="variant-barcode" name="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Opsional" />
          {vState?.errors?.barcode ? (
            <p role="alert" className="text-xs text-destructive">{vState.errors.barcode}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="variant-sell_price" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Harga jual (kosong = ikut produk)</Label>
            <Input
              id="variant-sell_price"
              name="sell_price"
              type="number"
              min="0"
              step="0.01"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder={`Ikut produk (${product.sell_price})`}
            />
            {vState?.errors?.sell_price ? (
              <p role="alert" className="text-xs text-destructive">{vState.errors.sell_price}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="variant-min_stock" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stok minimum</Label>
            <Input
              id="variant-min_stock"
              name="min_stock"
              type="number"
              min="0"
              step="0.01"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              required
            />
            {vState?.errors?.min_stock ? (
              <p role="alert" className="text-xs text-destructive">{vState.errors.min_stock}</p>
            ) : null}
          </div>
        </div>

        {vState?.message && !vState.ok ? (
          <p role="alert" className="text-xs text-destructive">{vState.message}</p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" variant="outline" disabled={vPending}>
            {vPending ? "Menyimpan..." : "Tambah Varian"}
          </Button>
        </div>
      </form>
    </div>
  );
}

type ProductFormProps = {
  mode: "create" | "edit";
  product?: Product;
  categories: ProductCategory[];
  action: (prevState: ProductActionState, formData: FormData) => Promise<ProductActionState>;
  onOpenChange: (open: boolean) => void;
  onBeforeSubmit?: (formData: FormData) => void;
};

export function ProductForm({
  mode,
  product,
  categories,
  action,
  onOpenChange,
  onBeforeSubmit,
}: ProductFormProps) {
  const wrappedAction = (prevState: ProductActionState, formData: FormData) => {
    onBeforeSubmit?.(formData);
    return action(prevState, formData);
  };
  const [state, formAction, pending] = useActionState(wrappedAction, undefined);
  const router = useRouter();
  const submitted = useRef(false);

  useActionToast(state, mode === "create" ? "Produk berhasil dibuat" : "Produk berhasil diperbarui");

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    unit: product?.unit ?? "",
    category_id: product?.category_id ?? "",
    cost_price: product?.cost_price != null ? String(product.cost_price) : "",
    sell_price: product?.sell_price != null ? String(product.sell_price) : "",
    min_stock: product?.min_stock != null ? String(product.min_stock) : "",
  });
  const [liveErrors, setLiveErrors] = useState<Record<string, string>>({});

  const setValue = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setLiveErrors((prev) => ({ ...prev, ...validateField(field, value) }));
    }
  };

  const handleBlur = (field: string) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setLiveErrors((prev) => ({ ...prev, ...validateField(field, values[field]) }));
  };

  const validateField = (field: string, value: string) => {
    const errors: Record<string, string> = {};
    if (["sku", "name", "unit", "category_id"].includes(field) && !value.trim()) {
      errors[field] = "Wajib diisi";
    }
    if (["cost_price", "sell_price", "min_stock"].includes(field)) {
      const n = Number(value);
      if (value === "" || Number.isNaN(n) || n < 0) {
        errors[field] = "Harus angka ≥ 0";
      }
    }
    if (field === "sell_price") {
      const cost = Number(values.cost_price || 0);
      const sell = Number(value || 0);
      if (sell > 0 && cost > sell) {
        errors.sell_price = "Harga jual di bawah harga beli";
      }
    }
    return errors;
  };

  useEffect(() => {
    if (state?.ok && !submitted.current) {
      submitted.current = true;
      router.refresh();
      onOpenChange(false);
      const timer = setTimeout(() => {
        submitted.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state, router, onOpenChange]);

  const activeCategories = categories.filter((c) => c.is_active);

  return (
    <div className="space-y-4">
    <form action={formAction} className="space-y-4">
      {product ? <input type="hidden" name="id" value={product.$id} /> : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sku" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">SKU</Label>
          <Input id="sku" name="sku" defaultValue={product?.sku} required placeholder="BRG-001" onChange={setValue("sku")} onBlur={handleBlur("sku")} />
          {(liveErrors.sku ?? state?.errors?.sku) ? (
            <p role="alert" className="text-xs text-destructive">{liveErrors.sku ?? state?.errors?.sku}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="barcode" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Barcode</Label>
          <Input id="barcode" name="barcode" defaultValue={product?.barcode ?? ""} placeholder="Opsional" />
          {state?.errors?.barcode ? (
            <p role="alert" className="text-xs text-destructive">{state.errors.barcode}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nama produk</Label>
        <Input id="name" name="name" defaultValue={product?.name} required onChange={setValue("name")} onBlur={handleBlur("name")} />
        {(liveErrors.name ?? state?.errors?.name) ? (
          <p role="alert" className="text-xs text-destructive">{liveErrors.name ?? state?.errors?.name}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="category_id" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Kategori</Label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={product?.category_id ?? ""}
            required
            onBlur={handleBlur("category_id")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" disabled>
              Pilih kategori
            </option>
            {activeCategories.map((category) => (
              <option key={category.$id} value={category.$id}>
                {category.name}
              </option>
            ))}
          </select>
          {(liveErrors.category_id ?? state?.errors?.category_id) ? (
            <p role="alert" className="text-xs text-destructive">{liveErrors.category_id ?? state?.errors?.category_id}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="unit" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Satuan</Label>
          <Input id="unit" name="unit" defaultValue={product?.unit} required placeholder="pcs / box / kg" onChange={setValue("unit")} onBlur={handleBlur("unit")} />
          {(liveErrors.unit ?? state?.errors?.unit) ? (
            <p role="alert" className="text-xs text-destructive">{liveErrors.unit ?? state?.errors?.unit}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cost_price" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Harga beli</Label>
          <Input
            id="cost_price"
            name="cost_price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.cost_price ?? ""}
            required
            onChange={setValue("cost_price")}
            onBlur={handleBlur("cost_price")}
          />
          {(liveErrors.cost_price ?? state?.errors?.cost_price) ? (
            <p role="alert" className="text-xs text-destructive">{liveErrors.cost_price ?? state?.errors?.cost_price}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sell_price" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Harga jual</Label>
          <Input
            id="sell_price"
            name="sell_price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.sell_price ?? ""}
            required
            onChange={setValue("sell_price")}
            onBlur={handleBlur("sell_price")}
          />
          {(liveErrors.sell_price ?? state?.errors?.sell_price) ? (
            <p role="alert" className="text-xs text-destructive">{liveErrors.sell_price ?? state?.errors?.sell_price}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="min_stock" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stok minimum</Label>
          <Input
            id="min_stock"
            name="min_stock"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.min_stock ?? ""}
            required
            onChange={setValue("min_stock")}
            onBlur={handleBlur("min_stock")}
          />
          {(liveErrors.min_stock ?? state?.errors?.min_stock) ? (
            <p role="alert" className="text-xs text-destructive">{liveErrors.min_stock ?? state?.errors?.min_stock}</p>
          ) : null}
        </div>
      </div>

      {state?.message && !state.ok ? (
        <p role="alert" className="text-xs text-destructive">{state.message}</p>
      ) : null}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : mode === "create" ? "Simpan" : "Perbarui"}
        </Button>
      </div>
    </form>
    {mode === "edit" && product ? <VariantSection product={product} /> : null}
    </div>
  );
}
