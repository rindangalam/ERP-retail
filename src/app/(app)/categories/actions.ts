"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import {
  createCategory,
  setCategoryActive,
  updateCategory,
} from "@/lib/inventory";

export type CategoryActionState =
  | { ok: boolean; errors?: Record<string, string>; message?: string }
  | undefined;

const ALLOWED_ROLES = ["admin", "warehouse"];

export async function createCategoryAction(
  prevState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const session = await requireRole(ALLOWED_ROLES);

  const result = await createCategory(
    {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath("/categories");
    return { ok: true, message: "Kategori berhasil dibuat." };
  }

  const hasFieldErrors = Object.keys(result.errors).length > 0;
  return {
    ok: false,
    errors: result.errors,
    message: hasFieldErrors ? undefined : "Gagal menyimpan kategori.",
  };
}

export async function updateCategoryAction(
  prevState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");

  const result = await updateCategory(
    id,
    {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath("/categories");
    return { ok: true, message: "Kategori diperbarui." };
  }

  const hasFieldErrors = Object.keys(result.errors).length > 0;
  return {
    ok: false,
    errors: result.errors,
    message: hasFieldErrors ? undefined : "Gagal memperbarui kategori.",
  };
}

export async function toggleCategoryActiveAction(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";

  await setCategoryActive(id, isActive, session.userId);
  revalidatePath("/categories");
}
