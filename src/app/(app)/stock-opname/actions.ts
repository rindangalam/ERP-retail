"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import {
  addOpnameItem,
  cancelOpname,
  createOpname,
  deleteOpnameItem,
  postOpname,
  updateOpname,
  updateOpnameItem,
} from "@/lib/opname";

export type OpnameActionState =
  | { ok: boolean; errors?: Record<string, string>; message?: string; data?: { id: string } }
  | undefined;

const ALLOWED_ROLES = ["admin", "warehouse"];
const PATH = "/stock-opname";

function toNumber(value: FormDataEntryValue | null): number {
  if (value === null) return NaN;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function stateFrom(result: {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
}): OpnameActionState {
  const hasFieldErrors = result.ok ? false : Object.keys(result.errors ?? {}).length > 0;
  return {
    ok: result.ok,
    errors: result.ok ? undefined : result.errors,
    message: result.ok
      ? result.message
      : hasFieldErrors
        ? undefined
        : (result.message ?? "Gagal menyimpan."),
  };
}

export async function createOpnameAction(
  prevState: OpnameActionState,
  formData: FormData
): Promise<OpnameActionState> {
  const session = await requireRole(ALLOWED_ROLES);
  const result = await createOpname(
    {
      opname_date: String(formData.get("opname_date") ?? ""),
      note: String(formData.get("note") ?? ""),
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath(PATH);
    return { ok: true, message: "Opname dibuat.", data: { id: result.data.$id } };
  }
  return stateFrom(result);
}

export async function updateOpnameAction(
  prevState: OpnameActionState,
  formData: FormData
): Promise<OpnameActionState> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");
  const result = await updateOpname(
    id,
    {
      opname_date: String(formData.get("opname_date") ?? ""),
      note: String(formData.get("note") ?? ""),
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath(PATH);
    return { ok: true, message: "Opname diperbarui." };
  }
  return stateFrom(result);
}

export async function cancelOpnameAction(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");
  await cancelOpname(id, session.userId);
  revalidatePath(PATH);
}

export async function addOpnameItemAction(
  prevState: OpnameActionState,
  formData: FormData
): Promise<OpnameActionState> {
  const session = await requireRole(ALLOWED_ROLES);
  const result = await addOpnameItem(
    {
      stock_opname_id: String(formData.get("stock_opname_id") ?? ""),
      product_id: String(formData.get("product_id") ?? ""),
      actual_qty: toNumber(formData.get("actual_qty")),
      note: String(formData.get("note") ?? ""),
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath(PATH);
    return { ok: true, message: "Item ditambahkan." };
  }
  return stateFrom(result);
}

export async function updateOpnameItemAction(
  prevState: OpnameActionState,
  formData: FormData
): Promise<OpnameActionState> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");
  const result = await updateOpnameItem(
    id,
    {
      actual_qty: toNumber(formData.get("actual_qty")),
      note: String(formData.get("note") ?? ""),
    },
    session.userId
  );

  if (result.ok) {
    revalidatePath(PATH);
    return { ok: true, message: "Item diperbarui." };
  }
  return stateFrom(result);
}

export async function deleteOpnameItemAction(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");
  await deleteOpnameItem(id, session.userId);
  revalidatePath(PATH);
}

export async function postOpnameAction(formData: FormData): Promise<OpnameActionState> {
  const session = await requireRole(ALLOWED_ROLES);
  const id = String(formData.get("id") ?? "");
  const result = await postOpname(id, session.userId);

  if (result.ok) {
    revalidatePath(PATH);
    return {
      ok: true,
      message: `Opname di-posting: ${result.data.movement_count} adjustment stok.`,
    };
  }
  return stateFrom(result);
}
