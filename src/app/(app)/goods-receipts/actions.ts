"use server";

import { redirect } from "next/navigation";
import { createGoodsReceipt, cancelGoodsReceipt, postGoodsReceipt } from "@/lib/goods-receipt";
import type { GoodsReceiptInput } from "@/lib/goods-receipt-validation";

const SYSTEM_USER = "admin@erp.local";

export async function _createGoodsReceipt(formData: FormData): Promise<{ ok: boolean; errors?: Record<string, string> }> {
  const poId = formData.get("purchase_order_id") as string;
  const receivedDate = formData.get("received_date") as string;
  const notes = (formData.get("notes") as string) || undefined;
  const itemsRaw = formData.get("items") as string | null;

  if (!itemsRaw) {
    return { ok: false, errors: { items: "Tidak ada item." } };
  }

  let items: GoodsReceiptInput["items"];
  try {
    items = JSON.parse(itemsRaw) as GoodsReceiptInput["items"];
  } catch {
    return { ok: false, errors: { items: "Format item tidak valid." } };
  }

  const result = await createGoodsReceipt(
    { purchase_order_id: poId, received_date: receivedDate, notes, items },
    SYSTEM_USER
  );

  if (!result.ok) return { ok: false, errors: result.errors };
  redirect("/goods-receipts");
}

export async function _cancelGoodsReceipt(
  grId: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await cancelGoodsReceipt(grId, SYSTEM_USER);
  if (!result.ok) {
    if (result.code === "not_draft") return { ok: false, error: "Hanya GR draft yang bisa dibatalkan." };
    return { ok: false, error: "Gagal membatalkan GR." };
  }
  return { ok: true };
}

export async function _postGoodsReceipt(
  grId: string
): Promise<{ ok: boolean; movement_count?: number; new_po_status?: string; error?: string }> {
  const result = await postGoodsReceipt(grId, SYSTEM_USER);
  if (!result.ok) {
    return { ok: false, error: result.errors._form ?? "Gagal mem-posting GR." };
  }
  return { ok: true, movement_count: result.data.movement_count, new_po_status: result.data.new_po_status };
}
