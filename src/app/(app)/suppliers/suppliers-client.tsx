"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const columns: Column<Supplier>[] = [
    {
      key: "code",
      header: "Kode",
      sortable: true,
      sortValue: (s) => s.code,
      className: "font-mono text-xs",
      render: (s) => s.code,
    },
    {
      key: "name",
      header: "Nama",
      sortable: true,
      sortValue: (s) => s.name,
      className: "font-medium",
      render: (s) => s.name,
    },
    {
      key: "contact",
      header: "Kontak",
      className: "text-muted-foreground",
      render: (s) => s.contact_person || "—",
    },
    {
      key: "phone",
      header: "Telepon",
      className: "text-muted-foreground",
      render: (s) => s.phone || "—",
    },
    {
      key: "payment_terms",
      header: "Termin",
      sortable: true,
      sortValue: (s) => s.payment_terms ?? "",
      render: (s) =>
        s.payment_terms ? (
          <Badge variant="outline">
            {PAYMENT_TERM_LABELS[s.payment_terms] ?? s.payment_terms}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (s) => (s.is_active ? "aktif" : "nonaktif"),
      render: (s) =>
        s.is_active ? (
          <Badge variant="outline" className="text-positive">Aktif</Badge>
        ) : (
          <Badge variant="outline" className="text-destructive">Nonaktif</Badge>
        ),
    },
    {
      key: "actions",
      header: "Aksi",
      className: "w-40",
      render: (s) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
            Edit
          </Button>
          <form action={toggleSupplierActiveAction}>
            <input type="hidden" name="id" value={s.$id} />
            <input
              type="hidden"
              name="is_active"
              value={String(!s.is_active)}
            />
            <Button variant="ghost" size="sm" type="submit">
              {s.is_active ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </form>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Supplier</h1>
          <p className="text-xs text-muted-foreground">
            Master pemasok untuk purchase order.
          </p>
        </div>
        <MotionButton onClick={openCreate}>Tambah Supplier</MotionButton>
      </div>

      <DataTable
        columns={columns}
        rows={suppliers}
        rowKey={(s) => s.$id}
        initialSort={{ key: "name", dir: "asc" }}
        empty={
          suppliers.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Belum ada supplier"
              description="Tambahkan supplier pertama untuk purchase order."
              action={<Button onClick={openCreate}>Tambah Supplier</Button>}
            />
          ) : undefined
        }
        onRowClick={(s) => openEdit(s)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Supplier" : "Tambah Supplier"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Perbarui informasi supplier di bawah ini."
                : "Buat data supplier baru untuk purchase order."}
            </DialogDescription>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
