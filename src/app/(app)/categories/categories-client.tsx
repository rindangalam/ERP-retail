"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionButton } from "@/components/motion-button";
import { EmptyState } from "@/components/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductCategory } from "@/lib/inventory";
import {
  createCategoryAction,
  toggleCategoryActiveAction,
  updateCategoryAction,
} from "./actions";
import { CategoryForm } from "./category-form";

type CategoriesClientProps = {
  categories: ProductCategory[];
};

type Editing = { id: string; name: string; description: string } | null;

export function CategoriesClient({ categories }: CategoriesClientProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (category: ProductCategory) => {
    setEditing({
      id: category.$id,
      name: category.name,
      description: category.description ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Kategori Produk</h1>
          <p className="text-xs text-muted-foreground">Kelola kategori untuk master produk.</p>
        </div>
        <MotionButton onClick={openCreate}>Tambah Kategori</MotionButton>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 p-0">
                  <EmptyState
                    icon={Tags}
                    title="Belum ada kategori"
                    description="Tambahkan kategori pertama untuk mengelompokkan produk."
                    action={<Button onClick={openCreate}>Tambah Kategori</Button>}
                  />
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.$id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.description || "—"}
                  </TableCell>
                  <TableCell>
                    {category.is_active ? (
                      <Badge variant="outline" className="text-positive">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-destructive">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(category)}>
                        Edit
                      </Button>
                      <form
                        action={toggleCategoryActiveAction}
                        onSubmit={() => {
                          /* aksi via server action */
                        }}
                      >
                        <input type="hidden" name="id" value={category.$id} />
                        <input
                          type="hidden"
                          name="is_active"
                          value={String(!category.is_active)}
                        />
                        <Button variant="ghost" size="sm" type="submit">
                          {category.is_active ? "Nonaktifkan" : "Aktifkan"}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Perbarui informasi kategori di bawah ini."
                : "Buat kategori baru untuk master produk."}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            mode={editing ? "edit" : "create"}
            categoryId={editing?.id}
            initialName={editing?.name}
            initialDescription={editing?.description}
            action={editing ? updateCategoryAction : createCategoryAction}
            onOpenChange={setOpen}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
