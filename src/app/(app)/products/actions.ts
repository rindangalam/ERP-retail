"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import {
  createProduct,
  setProductActive,
  updateProduct,
} from "@/lib/inventory";

export type ProductActionState =
  | { ok: boolean; errors?: Record<string, string>; message?: string }
  | undefined;

const ALLOWED_ROLES = ["admin", "warehouse"];

function toNumber(value: FormDataEntryValue | null): number {
  if (value === null) return NaN;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function createProductAction(
  prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const session = await requireRole(ALLOWED_ROLES);

  const result = await createProduct(
    {
      sku: String(formData.get("sku") ?? ""),
      name: String(formData.get("name") ?? ""),
      barcode: String(formData.get("barcode") ?? ""),
      category_id: String(formData.get("category_id") ?? ""),
      unit: String(formData.get("unit") ?? ""),
      cost_price: toNumber(formData.get("cost_price")),
      sell_price: toNumber(formData.get("sell_price")),
      min_stock: toNumber(formData.get("min_stock")),
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath("/products");
    return { ok: true, message: "Produk berhasil dibuat." };
  }

  const hasFieldErrors = Object.keys(result.errors).length > 0;
  return {
    ok: false,
    errors: result.errors,
    message: hasFieldErrors ? undefined : "Gagal menyimpan produk.",
  };
}

export async function updateProductAction(
  prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");

  const result = await updateProduct(
    id,
    {
      sku: String(formData.get("sku") ?? ""),
      name: String(formData.get("name") ?? ""),
      barcode: String(formData.get("barcode") ?? ""),
      category_id: String(formData.get("category_id") ?? ""),
      unit: String(formData.get("unit") ?? ""),
      cost_price: toNumber(formData.get("cost_price")),
      sell_price: toNumber(formData.get("sell_price")),
      min_stock: toNumber(formData.get("min_stock")),
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath("/products");
    return { ok: true, message: "Produk diperbarui." };
  }

  const hasFieldErrors = Object.keys(result.errors).length > 0;
  return {
    ok: false,
    errors: result.errors,
    message: hasFieldErrors ? undefined : "Gagal memperbarui produk.",
  };
}

export async function toggleProductActiveAction(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";

  await setProductActive(id, isActive, session.userId);
  revalidatePath("/products");
}
