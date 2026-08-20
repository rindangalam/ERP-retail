"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type SupplierActionState } from "./actions";
import { useActionToast } from "@/lib/use-action-toast";

const PAYMENT_TERM_OPTIONS = [
  { value: "cod", label: "COD (Tunai)" },
  { value: "net7", label: "Net 7 hari" },
  { value: "net14", label: "Net 14 hari" },
  { value: "net30", label: "Net 30 hari" },
  { value: "net60", label: "Net 60 hari" },
];

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

type SupplierFormProps = {
  mode: "create" | "edit";
  supplierId?: string;
  initialCode?: string;
  initialName?: string;
  initialContactPerson?: string;
  initialPhone?: string;
  initialEmail?: string;
  initialAddress?: string;
  initialPaymentTerms?: string;
  action: (prevState: SupplierActionState, formData: FormData) => Promise<SupplierActionState>;
  onOpenChange: (open: boolean) => void;
};

export function SupplierForm({
  mode,
  supplierId,
  initialCode = "",
  initialName = "",
  initialContactPerson = "",
  initialPhone = "",
  initialEmail = "",
  initialAddress = "",
  initialPaymentTerms = "",
  action,
  onOpenChange,
}: SupplierFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const router = useRouter();
  const submitted = useRef(false);

  useActionToast(state, mode === "create" ? "Supplier berhasil dibuat" : "Supplier berhasil diperbarui");

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

  return (
    <form action={formAction} className="space-y-4">
      {supplierId ? <input type="hidden" name="id" value={supplierId} /> : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="code" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Kode supplier</Label>
          <Input id="code" name="code" defaultValue={initialCode} placeholder="SUP-001" required />
          {state?.errors?.code ? (
            <p role="alert" className="text-xs text-destructive">{state.errors.code}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nama supplier</Label>
          <Input id="name" name="name" defaultValue={initialName} required />
          {state?.errors?.name ? (
            <p role="alert" className="text-xs text-destructive">{state.errors.name}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact_person" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nama kontak</Label>
        <Input
          id="contact_person"
          name="contact_person"
          defaultValue={initialContactPerson}
          placeholder="Opsional"
        />
        {state?.errors?.contact_person ? (
          <p role="alert" className="text-xs text-destructive">{state.errors.contact_person}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Telepon</Label>
          <Input id="phone" name="phone" defaultValue={initialPhone} placeholder="Opsional" />
          {state?.errors?.phone ? (
            <p role="alert" className="text-xs text-destructive">{state.errors.phone}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={initialEmail} placeholder="Opsional" />
          {state?.errors?.email ? (
            <p role="alert" className="text-xs text-destructive">{state.errors.email}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Alamat</Label>
        <Textarea
          id="address"
          name="address"
          defaultValue={initialAddress}
          rows={3}
          placeholder="Opsional"
        />
        {state?.errors?.address ? (
          <p role="alert" className="text-xs text-destructive">{state.errors.address}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="payment_terms" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Termin pembayaran</Label>
        <select id="payment_terms" name="payment_terms" defaultValue={initialPaymentTerms} className={SELECT_CLASS}>
          <option value="">Pilih termin (opsional)</option>
          {PAYMENT_TERM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {state?.errors?.payment_terms ? (
          <p role="alert" className="text-xs text-destructive">{state.errors.payment_terms}</p>
        ) : null}
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
  );
}
