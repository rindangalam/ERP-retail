"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { createSalesOrder, cancelSalesOrder, confirmSalesOrder } from "@/lib/sales-order";
import type { SalesOrderItemInput } from "@/lib/sales-order-validation";

export type SalesOrderActionState =
  | { ok: boolean; errors?: Record<string, string>; message?: string }
  | undefined;

const ALLOWED_ROLES = ["admin", "sales"];

function parseItems(raw: FormDataEntryValue | null): SalesOrderItemInput[] {
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
      .filter((item: SalesOrderItemInput) => item.product_id);
  } catch {
    return [];
  }
}

export async function createSalesOrderAction(
  prevState: SalesOrderActionState,
  formData: FormData
): Promise<SalesOrderActionState> {
  const session = await requireRole(ALLOWED_ROLES);

  const result = await createSalesOrder(
    {
      customer_id: String(formData.get("customer_id") ?? ""),
      order_date: String(formData.get("order_date") ?? ""),
      expected_date: String(formData.get("expected_date") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      items: parseItems(formData.get("items")),
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath("/sales-orders");
    return { ok: true, message: "Sales Order berhasil dibuat." };
  }

  const hasFieldErrors = Object.keys(result.errors).length > 0;
  return {
    ok: false,
    errors: result.errors,
    message: hasFieldErrors ? undefined : "Gagal menyimpan sales order.",
  };
}

export async function confirmSalesOrderAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");
  const result = await confirmSalesOrder(id, session.userId);
  if (!result.ok) {
    if (result.code === "not_draft") return { ok: false, error: "Hanya SO draft yang bisa dikonfirmasi." };
    return { ok: false, error: "Gagal mengkonfirmasi SO." };
  }
  return { ok: true };
}

export async function cancelSalesOrderAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");
  const result = await cancelSalesOrder(id, session.userId);
  if (!result.ok) {
    if (result.code === "not_draft") return { ok: false, error: "Hanya SO draft yang bisa dibatalkan." };
    return { ok: false, error: "Gagal membatalkan SO." };
  }
  return { ok: true };
}
