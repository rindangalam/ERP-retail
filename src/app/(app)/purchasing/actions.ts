"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { cancelPurchaseOrder, createPurchaseOrder } from "@/lib/purchase-order";
import type { PurchaseOrderItemInput } from "@/lib/purchase-order-validation";

export type PurchaseOrderActionState =
  | { ok: boolean; errors?: Record<string, string>; message?: string }
  | undefined;

const ALLOWED_ROLES = ["admin", "purchasing"];

function parseItems(raw: FormDataEntryValue | null): PurchaseOrderItemInput[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry: Record<string, unknown>) => ({
        product_id: String(entry.product_id ?? ""),
        quantity: Number(entry.quantity ?? 0),
        unit_price: Number(entry.unit_price ?? 0),
      }))
      .filter((item: PurchaseOrderItemInput) => item.product_id);
  } catch {
    return [];
  }
}

export async function createPurchaseOrderAction(
  prevState: PurchaseOrderActionState,
  formData: FormData
): Promise<PurchaseOrderActionState> {
  const session = await requireRole(ALLOWED_ROLES);

  const result = await createPurchaseOrder(
    {
      supplier_id: String(formData.get("supplier_id") ?? ""),
      order_date: String(formData.get("order_date") ?? ""),
      expected_date: String(formData.get("expected_date") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      items: parseItems(formData.get("items")),
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath("/purchasing");
    return { ok: true, message: "Purchase Order berhasil dibuat." };
  }

  const hasFieldErrors = Object.keys(result.errors).length > 0;
  return {
    ok: false,
    errors: result.errors,
    message: hasFieldErrors ? undefined : "Gagal menyimpan purchase order.",
  };
}

export async function cancelPurchaseOrderAction(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");

  await cancelPurchaseOrder(id, session.userId);
  revalidatePath("/purchasing");
}
