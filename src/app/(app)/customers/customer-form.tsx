"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type CustomerActionState } from "./actions";

type CustomerFormProps = {
  mode: "create" | "edit";
  customerId?: string;
  initialCode?: string;
  initialName?: string;
  initialContactPerson?: string;
  initialPhone?: string;
  initialEmail?: string;
  initialAddress?: string;
  initialCreditLimit?: string;
  action: (prevState: CustomerActionState, formData: FormData) => Promise<CustomerActionState>;
  onOpenChange: (open: boolean) => void;
};

export function CustomerForm({
  mode,
  customerId,
  initialCode = "",
  initialName = "",
  initialContactPerson = "",
  initialPhone = "",
  initialEmail = "",
  initialAddress = "",
  initialCreditLimit = "",
  action,
  onOpenChange,
}: CustomerFormProps) {
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

  return (
    <form action={formAction} className="space-y-4">
      {customerId ? <input type="hidden" name="id" value={customerId} /> : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Kode customer</Label>
          <Input id="code" name="code" defaultValue={initialCode} placeholder="CUST-001" required />
          {state?.errors?.code ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.code}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nama customer</Label>
          <Input id="name" name="name" defaultValue={initialName} required />
          {state?.errors?.name ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.name}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_person">Nama kontak</Label>
        <Input
          id="contact_person"
          name="contact_person"
          defaultValue={initialContactPerson}
          placeholder="Opsional"
        />
        {state?.errors?.contact_person ? (
          <p role="alert" className="text-sm text-destructive">{state.errors.contact_person}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telepon</Label>
          <Input id="phone" name="phone" defaultValue={initialPhone} placeholder="Opsional" />
          {state?.errors?.phone ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.phone}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={initialEmail} placeholder="Opsional" />
          {state?.errors?.email ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.email}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Alamat</Label>
        <Textarea
          id="address"
          name="address"
          defaultValue={initialAddress}
          rows={3}
          placeholder="Opsional"
        />
        {state?.errors?.address ? (
          <p role="alert" className="text-sm text-destructive">{state.errors.address}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="credit_limit">Batas kredit (Rp)</Label>
        <Input
          id="credit_limit"
          name="credit_limit"
          type="number"
          min={0}
          step={1000}
          defaultValue={initialCreditLimit}
          placeholder="0 = tidak ada batas"
        />
        {state?.errors?.credit_limit ? (
          <p role="alert" className="text-sm text-destructive">{state.errors.credit_limit}</p>
        ) : null}
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
