"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { Supplier } from "@/lib/supplier";
import {
  createSupplierAction,
  toggleSupplierActiveAction,
  updateSupplierAction,
} from "./actions";
import { SupplierForm } from "./supplier-form";

type SuppliersClientProps = {
  suppliers: Supplier[];
};

type Editing = {
  id: string;
  code: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  payment_terms: string;
} | null;

const PAYMENT_TERM_LABELS: Record<string, string> = {
  cod: "COD",
  net7: "Net 7",
  net14: "Net 14",
  net30: "Net 30",
  net60: "Net 60",
};

export function SuppliersClient({ suppliers }: SuppliersClientProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing({
      id: supplier.$id,
      code: supplier.code,
      name: supplier.name,
      contact_person: supplier.contact_person ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      payment_terms: supplier.payment_terms ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Supplier</h1>
          <p className="text-sm text-muted-foreground">
            Master pemasok untuk purchase order.
          </p>
        </div>
        <Button onClick={openCreate}>Tambah Supplier</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Termin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Belum ada supplier.
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.$id}>
                  <TableCell className="font-mono text-xs">{supplier.code}</TableCell>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {supplier.contact_person || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {supplier.phone || "—"}
                  </TableCell>
                  <TableCell>
                    {supplier.payment_terms ? (
                      <Badge variant="outline">
                        {PAYMENT_TERM_LABELS[supplier.payment_terms] ?? supplier.payment_terms}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.is_active ? (
                      <Badge variant="outline" className="text-emerald-600">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-destructive">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(supplier)}>
                        Edit
                      </Button>
                      <form action={toggleSupplierActiveAction}>
                        <input type="hidden" name="id" value={supplier.$id} />
                        <input
                          type="hidden"
                          name="is_active"
                          value={String(!supplier.is_active)}
                        />
                        <Button variant="ghost" size="sm" type="submit">
                          {supplier.is_active ? "Nonaktifkan" : "Aktifkan"}
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
            <SheetTitle>{editing ? "Edit Supplier" : "Tambah Supplier"}</SheetTitle>
            <SheetDescription>
              {editing
                ? "Perbarui informasi supplier di bawah ini."
                : "Buat data supplier baru untuk purchase order."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <SupplierForm
              mode={editing ? "edit" : "create"}
              supplierId={editing?.id}
              initialCode={editing?.code}
              initialName={editing?.name}
              initialContactPerson={editing?.contact_person}
              initialPhone={editing?.phone}
              initialEmail={editing?.email}
              initialAddress={editing?.address}
              initialPaymentTerms={editing?.payment_terms}
              action={editing ? updateSupplierAction : createSupplierAction}
              onOpenChange={setOpen}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
