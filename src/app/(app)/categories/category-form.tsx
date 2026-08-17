"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type CategoryActionState } from "./actions";

type CategoryFormProps = {
  mode: "create" | "edit";
  categoryId?: string;
  initialName?: string;
  initialDescription?: string;
  action: (prevState: CategoryActionState, formData: FormData) => Promise<CategoryActionState>;
  onOpenChange: (open: boolean) => void;
};

export function CategoryForm({
  mode,
  categoryId,
  initialName = "",
  initialDescription = "",
  action,
  onOpenChange,
}: CategoryFormProps) {
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
      {categoryId ? <input type="hidden" name="id" value={categoryId} /> : null}

      <div className="space-y-2">
        <Label htmlFor="name">Nama kategori</Label>
        <Input id="name" name="name" defaultValue={initialName} required />
        {state?.errors?.name ? (
          <p role="alert" className="text-sm text-destructive">{state.errors.name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initialDescription}
          rows={3}
          placeholder="Opsional"
        />
        {state?.errors?.description ? (
          <p role="alert" className="text-sm text-destructive">{state.errors.description}</p>
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
