"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import { MotionButton } from "@/components/motion-button";
import { EmptyState } from "@/components/empty-state";
import { Boxes as BoxesIconEmpty } from "lucide-react";
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

type OptimisticOp =
  | { type: "create"; product: Product }
  | { type: "toggle"; id: string; is_active: boolean };

function applyOptimistic(state: Product[], op: OptimisticOp): Product[] {
  if (op.type === "create") return [op.product, ...state];
  return state.map((p) => (p.$id === op.id ? { ...p, is_active: op.is_active } : p));
}

function tempProductFromFormData(formData: FormData): Product {
  const now = new Date().toISOString();
  return {
    $id: `temp-${Date.now()}`,
    $createdAt: now,
    $updatedAt: now,
    sku: String(formData.get("sku") ?? ""),
    name: String(formData.get("name") ?? ""),
    barcode: String(formData.get("barcode") ?? "") || null,
    category_id: String(formData.get("category_id") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    cost_price: Number(formData.get("cost_price") ?? 0),
    sell_price: Number(formData.get("sell_price") ?? 0),
    min_stock: Number(formData.get("min_stock") ?? 0),
    current_stock: 0,
    is_active: true,
    created_by: "",
    created_at: now,
  };
}

export function ProductsClient({ products, categories }: ProductsClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [optimisticProducts, addOptimistic] = useOptimistic(products, applyOptimistic);
  const [, startTransition] = useTransition();
  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return optimisticProducts.filter((product) => {
      if (categoryFilter && product.category_id !== categoryFilter) return false;
      if (!query) return true;
      return (
        product.sku.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query)
      );
    });
  }, [optimisticProducts, search, categoryFilter]);

  const toggleActive = (product: Product) => {
    const next = !product.is_active;
    startTransition(async () => {
      addOptimistic({ type: "toggle", id: product.$id, is_active: next });
      setTogglingId(product.$id);
      const formData = new FormData();
      formData.append("id", product.$id);
      formData.append("is_active", String(next));
      try {
        await toggleProductActiveAction(formData);
        router.refresh();
      } finally {
        setTogglingId(null);
      }
    });
  };

  const columns: Column<Product>[] = [
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      sortValue: (p) => p.sku,
      className: "font-mono text-xs",
      render: (p) => p.sku,
    },
    {
      key: "name",
      header: "Nama",
      sortable: true,
      sortValue: (p) => p.name,
      className: "font-medium",
      render: (p) => p.name,
    },
    {
      key: "category",
      header: "Kategori",
      sortable: true,
      sortValue: (p) => categoryName(p.category_id, categories),
      className: "text-muted-foreground",
      render: (p) => categoryName(p.category_id, categories),
    },
    {
      key: "unit",
      header: "Satuan",
      render: (p) => p.unit,
    },
    {
      key: "sell_price",
      header: "Harga Jual",
      sortable: true,
      sortValue: (p) => p.sell_price,
      className: "text-right",
      headClassName: "text-right",
      render: (p) => formatCurrency(p.sell_price),
    },
    {
      key: "current_stock",
      header: "Stok",
      sortable: true,
      sortValue: (p) => p.current_stock,
      className: "text-right",
      headClassName: "text-right",
      render: (p) => p.current_stock,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (p) => (p.is_active ? "aktif" : "nonaktif"),
      render: (p) =>
        p.is_active ? (
          <Badge variant="outline" className="text-positive">Aktif</Badge>
        ) : (
          <Badge variant="outline" className="text-destructive">Nonaktif</Badge>
        ),
    },
    {
      key: "actions",
      header: "Aksi",
      className: "w-40",
      render: (p) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(p);
              setOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleActive(p)}
            disabled={togglingId === p.$id}
          >
            {p.is_active ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Produk</h1>
          <p className="text-xs text-muted-foreground">Master produk untuk semua modul.</p>
        </div>
        <MotionButton
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Tambah Produk
        </MotionButton>
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

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(p) => p.$id}
        initialSort={{ key: "name", dir: "asc" }}
        emptyMessage={
          products.length === 0 ? "Belum ada produk. Tambahkan produk pertama untuk memulai." : "Tidak ada hasil pencarian."
        }
        empty={
          products.length === 0 ? (
            <EmptyState
              icon={BoxesIconEmpty}
              title="Belum ada produk"
              description="Tambahkan produk pertama untuk mulai mengelola inventori."
              action={<Button onClick={openCreate}>Tambah Produk</Button>}
            />
          ) : undefined
        }
        onRowClick={(p) => {
          setEditing(p);
          setOpen(true);
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Perbarui informasi produk. Harga historis pada transaksi tidak berubah."
                : "Buat produk baru dengan SKU unik."}
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            mode={editing ? "edit" : "create"}
            product={editing ?? undefined}
            categories={categories}
            action={editing ? updateProductAction : createProductAction}
            onOpenChange={setOpen}
            onBeforeSubmit={(formData) => {
              if (!editing) {
                addOptimistic({ type: "create", product: tempProductFromFormData(formData) });
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
