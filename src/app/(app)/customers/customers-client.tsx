"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
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
import type { Customer } from "@/lib/customer";
import {
  createCustomerAction,
  toggleCustomerActiveAction,
  updateCustomerAction,
} from "./actions";
import { CustomerForm } from "./customer-form";

type CustomersClientProps = {
  customers: Customer[];
};

type Editing = {
  id: string;
  code: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  credit_limit: string;
} | null;

export function CustomersClient({ customers }: CustomersClientProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing({
      id: customer.$id,
      code: customer.code,
      name: customer.name,
      contact_person: customer.contact_person ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
      credit_limit: customer.credit_limit != null ? String(customer.credit_limit) : "",
    });
    setOpen(true);
  };

  const columns: Column<Customer>[] = [
    {
      key: "code",
      header: "Kode",
      sortable: true,
      sortValue: (c) => c.code,
      className: "font-mono text-xs",
      render: (c) => c.code,
    },
    {
      key: "name",
      header: "Nama",
      sortable: true,
      sortValue: (c) => c.name,
      className: "font-medium",
      render: (c) => c.name,
    },
    {
      key: "contact",
      header: "Kontak",
      className: "text-muted-foreground",
      render: (c) => c.contact_person || "—",
    },
    {
      key: "phone",
      header: "Telepon",
      className: "text-muted-foreground",
      render: (c) => c.phone || "—",
    },
    {
      key: "email",
      header: "Email",
      className: "text-muted-foreground",
      render: (c) => c.email || "—",
    },
    {
      key: "credit_limit",
      header: "Batas Kredit",
      sortable: true,
      sortValue: (c) => c.credit_limit ?? 0,
      className: "text-right",
      headClassName: "text-right",
      render: (c) =>
        c.credit_limit != null
          ? `Rp ${c.credit_limit.toLocaleString("id-ID")}`
          : "—",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (c) => (c.is_active ? "aktif" : "nonaktif"),
      render: (c) =>
        c.is_active ? (
          <Badge variant="outline" className="text-positive">Aktif</Badge>
        ) : (
          <Badge variant="outline" className="text-destructive">Nonaktif</Badge>
        ),
    },
    {
      key: "actions",
      header: "Aksi",
      className: "w-40",
      render: (c) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
            Edit
          </Button>
          <form action={toggleCustomerActiveAction}>
            <input type="hidden" name="id" value={c.$id} />
            <input
              type="hidden"
              name="is_active"
              value={String(!c.is_active)}
            />
            <Button variant="ghost" size="sm" type="submit">
              {c.is_active ? "Nonaktifkan" : "Aktifkan"}
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
          <h1 className="text-lg font-semibold tracking-tight">Customer</h1>
          <p className="text-xs text-muted-foreground">
            Master data pelanggan untuk penjualan.
          </p>
        </div>
        <MotionButton onClick={openCreate}>Tambah Customer</MotionButton>
      </div>

      <DataTable
        columns={columns}
        rows={customers}
        rowKey={(c) => c.$id}
        initialSort={{ key: "name", dir: "asc" }}
        empty={
          customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Belum ada customer"
              description="Tambahkan customer pertama untuk penjualan."
              action={<Button onClick={openCreate}>Tambah Customer</Button>}
            />
          ) : undefined
        }
        onRowClick={(c) => openEdit(c)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Tambah Customer"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Perbarui informasi customer di bawah ini."
                : "Buat data customer baru."}
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            mode={editing ? "edit" : "create"}
            customerId={editing?.id}
            initialCode={editing?.code}
            initialName={editing?.name}
            initialContactPerson={editing?.contact_person}
            initialPhone={editing?.phone}
            initialEmail={editing?.email}
            initialAddress={editing?.address}
            initialCreditLimit={editing?.credit_limit}
            action={editing ? updateCustomerAction : createCustomerAction}
            onOpenChange={setOpen}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
