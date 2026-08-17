"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductCategory, Product } from "@/lib/inventory";
import { type ProductActionState } from "./actions";

type ProductFormProps = {
  mode: "create" | "edit";
  product?: Product;
  categories: ProductCategory[];
  action: (prevState: ProductActionState, formData: FormData) => Promise<ProductActionState>;
  onOpenChange: (open: boolean) => void;
};

export function ProductForm({
  mode,
  product,
  categories,
  action,
  onOpenChange,
}: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const router = useRouter();
  const submitted = useRef(false);

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
    <form action={formAction} className="space-y-4">
      {product ? <input type="hidden" name="id" value={product.$id} /> : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" defaultValue={product?.sku} required placeholder="BRG-001" />
          {state?.errors?.sku ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.sku}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" name="barcode" defaultValue={product?.barcode ?? ""} placeholder="Opsional" />
          {state?.errors?.barcode ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.barcode}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nama produk</Label>
        <Input id="name" name="name" defaultValue={product?.name} required />
        {state?.errors?.name ? (
          <p role="alert" className="text-sm text-destructive">{state.errors.name}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category_id">Kategori</Label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={product?.category_id ?? ""}
            required
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
          {state?.errors?.category_id ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.category_id}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Satuan</Label>
          <Input id="unit" name="unit" defaultValue={product?.unit} required placeholder="pcs / box / kg" />
          {state?.errors?.unit ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.unit}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cost_price">Harga beli</Label>
          <Input
            id="cost_price"
            name="cost_price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.cost_price ?? ""}
            required
          />
          {state?.errors?.cost_price ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.cost_price}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sell_price">Harga jual</Label>
          <Input
            id="sell_price"
            name="sell_price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.sell_price ?? ""}
            required
          />
          {state?.errors?.sell_price ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.sell_price}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="min_stock">Stok minimum</Label>
          <Input
            id="min_stock"
            name="min_stock"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.min_stock ?? ""}
            required
          />
          {state?.errors?.min_stock ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.min_stock}</p>
          ) : null}
        </div>
      </div>

      {state?.message && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : mode === "create" ? "Simpan" : "Perbarui"}
        </Button>
      </div>
    </form>
  );
}
