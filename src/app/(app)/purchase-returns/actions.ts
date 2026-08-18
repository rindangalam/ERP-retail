"use server";

import { redirect } from "next/navigation";
import { createPurchaseReturn, cancelPurchaseReturn, postPurchaseReturn } from "@/lib/purchase-return";
import type { PurchaseReturnInput } from "@/lib/purchase-return-validation";

const SYSTEM_USER = "admin@erp.local";

export async function _createPurchaseReturn(formData: FormData): Promise<{ ok: boolean; errors?: Record<string, string> }> {
  const supplierId = formData.get("supplier_id") as string;
  const purchaseOrderId = (formData.get("purchase_order_id") as string) || undefined;
  const returnDate = formData.get("return_date") as string;
  const notes = (formData.get("notes") as string) || undefined;
  const itemsRaw = formData.get("items") as string | null;

  if (!itemsRaw) {
    return { ok: false, errors: { items: "Tidak ada item." } };
  }

  let items: PurchaseReturnInput["items"];
  try {
    items = JSON.parse(itemsRaw) as PurchaseReturnInput["items"];
  } catch {
    return { ok: false, errors: { items: "Format item tidak valid." } };
  }

  const result = await createPurchaseReturn(
    { supplier_id: supplierId, purchase_order_id: purchaseOrderId, return_date: returnDate, notes, items },
    SYSTEM_USER
  );

  if (!result.ok) return { ok: false, errors: result.errors };
  redirect("/purchase-returns");
}

export async function _cancelPurchaseReturn(
  prId: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await cancelPurchaseReturn(prId, SYSTEM_USER);
  if (!result.ok) {
    if (result.code === "not_draft") return { ok: false, error: "Hanya PR draft yang bisa dibatalkan." };
    return { ok: false, error: "Gagal membatalkan PR." };
  }
  return { ok: true };
}

export async function _postPurchaseReturn(
  prId: string
): Promise<{ ok: boolean; movement_count?: number; new_po_status?: string; error?: string }> {
  const result = await postPurchaseReturn(prId, SYSTEM_USER);
  if (!result.ok) {
    return { ok: false, error: result.errors._form ?? "Gagal mem-posting PR." };
  }
  return { ok: true, movement_count: result.data.movement_count, new_po_status: result.data.new_po_status };
}
