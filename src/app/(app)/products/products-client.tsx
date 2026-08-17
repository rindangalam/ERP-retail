"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Product, ProductCategory } from "@/lib/inventory";
import {
  createProductAction,
  toggleProductActiveAction,
  updateProductAction,
} from "./actions";
import { ProductForm } from "./product-form";

type ProductsClientProps = {
  products: Product[];
  categories: ProductCategory[];
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function categoryName(categoryId: string, categories: ProductCategory[]): string {
  return categories.find((c) => c.$id === categoryId)?.name ?? "—";
}

export function ProductsClient({ products, categories }: ProductsClientProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (categoryFilter && product.category_id !== categoryFilter) return false;
      if (!query) return true;
      return (
        product.sku.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query)
      );
    });
  }, [products, search, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produk</h1>
          <p className="text-sm text-muted-foreground">Master produk untuk semua modul.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Tambah Produk
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari SKU atau nama..."
          className="max-w-xs"
          aria-label="Cari produk"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Filter kategori"
        >
          <option value="">Semua kategori</option>
          {categories.map((category) => (
            <option key={category.$id} value={category.$id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {products.length === 0 ? "Belum ada produk." : "Tidak ada hasil pencarian."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => (
                <TableRow key={product.$id}>
                  <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoryName(product.category_id, categories)}
                  </TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.sell_price)}
                  </TableCell>
                  <TableCell className="text-right">{product.current_stock}</TableCell>
                  <TableCell>
                    {product.is_active ? (
                      <Badge variant="outline" className="text-emerald-600">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-destructive">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(product);
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <form action={toggleProductActiveAction}>
                        <input type="hidden" name="id" value={product.$id} />
                        <input
                          type="hidden"
                          name="is_active"
                          value={String(!product.is_active)}
                        />
                        <Button variant="ghost" size="sm" type="submit">
                          {product.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Produk" : "Tambah Produk"}</SheetTitle>
            <SheetDescription>
              {editing
                ? "Perbarui informasi produk. Harga historis pada transaksi tidak berubah."
                : "Buat produk baru dengan SKU unik."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ProductForm
              mode={editing ? "edit" : "create"}
              product={editing ?? undefined}
              categories={categories}
              action={editing ? updateProductAction : createProductAction}
              onOpenChange={setOpen}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
