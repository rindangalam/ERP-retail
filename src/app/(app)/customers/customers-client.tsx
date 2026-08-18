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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customer</h1>
          <p className="text-sm text-muted-foreground">
            Master data pelanggan untuk penjualan.
          </p>
        </div>
        <Button onClick={openCreate}>Tambah Customer</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Batas Kredit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Belum ada customer.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.$id}>
                  <TableCell className="font-mono text-xs">{customer.code}</TableCell>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.contact_person || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.phone || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.email || "—"}
                  </TableCell>
                  <TableCell>
                    {customer.credit_limit != null
                      ? `Rp ${customer.credit_limit.toLocaleString("id-ID")}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {customer.is_active ? (
                      <Badge variant="outline" className="text-emerald-600">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-destructive">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(customer)}>
                        Edit
                      </Button>
                      <form action={toggleCustomerActiveAction}>
                        <input type="hidden" name="id" value={customer.$id} />
                        <input
                          type="hidden"
                          name="is_active"
                          value={String(!customer.is_active)}
                        />
                        <Button variant="ghost" size="sm" type="submit">
                          {customer.is_active ? "Nonaktifkan" : "Aktifkan"}
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
            <SheetTitle>{editing ? "Edit Customer" : "Tambah Customer"}</SheetTitle>
            <SheetDescription>
              {editing
                ? "Perbarui informasi customer di bawah ini."
                : "Buat data customer baru."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
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
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
