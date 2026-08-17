import "server-only";
import { ID, Permission, Query, Role } from "node-appwrite";
import { Functions } from "node-appwrite";
import { getAdminClient, adminDatabases } from "./appwrite-server";
import { findProductById } from "./inventory";
import { validateOpnameInput, validateOpnameItemInput } from "./opname-validation";

export const OPN_COLLECTION = "stock_opnames";
export const OPN_ITEMS_COLLECTION = "stock_opname_items";

type AppwriteDoc = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: unknown;
};

export type Opname = AppwriteDoc & {
  opname_number: string;
  opname_date: string;
  status: "draft" | "posted" | "cancelled";
  note: string | null;
  created_by: string;
  created_at: string;
  posted_by: string | null;
  posted_at: string | null;
};

export type OpnameItem = AppwriteDoc & {
  stock_opname_id: string;
  product_id: string;
  system_qty: number;
  actual_qty: number;
  difference: number;
  note: string | null;
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; code?: string };

const OPN_PERMISSIONS = [
  Permission.read(Role.label("admin")),
  Permission.read(Role.label("warehouse")),
  Permission.write(Role.label("admin")),
  Permission.write(Role.label("warehouse")),
];

function nowIso(): string {
  return new Date().toISOString();
}

function toPlain<T extends Record<string, unknown>>(doc: T): T {
  return { ...doc };
}

function toAppwriteError(code: string): Result<never> {
  return { ok: false, errors: {}, code };
}

function generateOpnameNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");
  return `OP-${date}-${rand}`;
}

export async function listOpnames(): Promise<Opname[]> {
  const result = await adminDatabases().listDocuments("erp", OPN_COLLECTION, [
    Query.orderDesc("created_at"),
    Query.limit(200),
  ]);
  return (result.documents as unknown as Opname[]).map(toPlain);
}

export async function listOpnameItemsFor(opnameIds: string[]): Promise<OpnameItem[]> {
  if (opnameIds.length === 0) return [];
  const result = await adminDatabases().listDocuments("erp", OPN_ITEMS_COLLECTION, [
    Query.equal("stock_opname_id", opnameIds),
    Query.limit(500),
  ]);
  return (result.documents as unknown as OpnameItem[]).map(toPlain);
}

export async function listOpnameItems(opnameId: string): Promise<OpnameItem[]> {
  const result = await adminDatabases().listDocuments("erp", OPN_ITEMS_COLLECTION, [
    Query.equal("stock_opname_id", [opnameId]),
  ]);
  return (result.documents as unknown as OpnameItem[]).map(toPlain);
}

export async function getOpname(id: string): Promise<Opname | null> {
  try {
    const doc = await adminDatabases().getDocument("erp", OPN_COLLECTION, id);
    return toPlain(doc as unknown as Opname);
  } catch {
    return null;
  }
}

export async function createOpname(
  input: { opname_date: string; note?: string },
  userId: string
): Promise<Result<Opname>> {
  const errors = validateOpnameInput(input);
  if (errors) return { ok: false, errors };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const doc = await adminDatabases().createDocument({
        databaseId: "erp",
        collectionId: OPN_COLLECTION,
        documentId: ID.unique(),
        data: {
          opname_number: generateOpnameNumber(),
          opname_date: input.opname_date,
          status: "draft",
          note: input.note?.trim() || null,
          created_by: userId,
          created_at: nowIso(),
        },
        permissions: OPN_PERMISSIONS,
      });
      return { ok: true, data: toPlain(doc as unknown as Opname) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/unique|duplicate|already exists/i.test(message) && attempt < 2) continue;
      console.error("createOpname failed:", error);
      return toAppwriteError("create_opname_failed");
    }
  }
  return toAppwriteError("create_opname_failed");
}

export async function updateOpname(
  id: string,
  input: { opname_date: string; note?: string },
  userId: string
): Promise<Result<Opname>> {
  const existing = await getOpname(id);
  if (!existing) return { ok: false, errors: { _form: "Opname tidak ditemukan." } };
  if (existing.status !== "draft") {
    return { ok: false, errors: { _form: "Opname sudah " + (existing.status === "posted" ? "di-posting" : "dibatalkan") + ", tidak bisa diubah." } };
  }

  const errors = validateOpnameInput(input);
  if (errors) return { ok: false, errors };

  try {
    const doc = await adminDatabases().updateDocument({
      databaseId: "erp",
      collectionId: OPN_COLLECTION,
      documentId: id,
      data: {
        opname_date: input.opname_date,
        note: input.note?.trim() || null,
      },
    });
    return { ok: true, data: toPlain(doc as unknown as Opname) };
  } catch (error) {
    console.error("updateOpname failed:", error);
    return toAppwriteError("update_opname_failed");
  }
}

export async function cancelOpname(id: string, userId: string): Promise<Result<Opname>> {
  const existing = await getOpname(id);
  if (!existing) return { ok: false, errors: { _form: "Opname tidak ditemukan." } };
  if (existing.status !== "draft") {
    return { ok: false, errors: { _form: "Hanya opname draft yang bisa dibatalkan." } };
  }

  try {
    const doc = await adminDatabases().updateDocument({
      databaseId: "erp",
      collectionId: OPN_COLLECTION,
      documentId: id,
      data: { status: "cancelled" },
    });
    return { ok: true, data: toPlain(doc as unknown as Opname) };
  } catch (error) {
    console.error("cancelOpname failed:", error);
    return toAppwriteError("cancel_opname_failed");
  }
}

export async function addOpnameItem(
  input: { stock_opname_id: string; product_id: string; actual_qty: number; note?: string },
  userId: string
): Promise<Result<OpnameItem>> {
  const errors = validateOpnameItemInput(input);
  if (errors) return { ok: false, errors };

  const opname = await getOpname(input.stock_opname_id);
  if (!opname) return { ok: false, errors: { _form: "Opname tidak ditemukan." } };
  if (opname.status !== "draft") {
    return { ok: false, errors: { _form: "Item hanya bisa ditambah ke opname draft." } };
  }

  const product = await findProductById(input.product_id);
  if (!product) return { ok: false, errors: { product_id: "Produk tidak ditemukan." } };
  if (!product.is_active) {
    return { ok: false, errors: { product_id: "Produk nonaktif tidak bisa diopname." } };
  }

  const existing = await adminDatabases().listDocuments("erp", OPN_ITEMS_COLLECTION, [
    Query.equal("stock_opname_id", [input.stock_opname_id]),
    Query.equal("product_id", [input.product_id]),
    Query.limit(1),
  ]);
  if (existing.documents.length > 0) {
    return { ok: false, errors: { product_id: "Produk ini sudah ada di opname." } };
  }

  const systemQty = Number(product.current_stock ?? 0);
  const actualQty = input.actual_qty;

  try {
    const doc = await adminDatabases().createDocument({
      databaseId: "erp",
      collectionId: OPN_ITEMS_COLLECTION,
      documentId: ID.unique(),
      data: {
        stock_opname_id: input.stock_opname_id,
        product_id: input.product_id,
        system_qty: systemQty,
        actual_qty: actualQty,
        difference: actualQty - systemQty,
        note: input.note?.trim() || null,
      },
      permissions: OPN_PERMISSIONS,
    });
    return { ok: true, data: toPlain(doc as unknown as OpnameItem) };
  } catch (error) {
    console.error("addOpnameItem failed:", error);
    return toAppwriteError("add_opname_item_failed");
  }
}

export async function updateOpnameItem(
  id: string,
  input: { actual_qty: number; note?: string },
  userId: string
): Promise<Result<OpnameItem>> {
  const errors = validateOpnameItemInput({ product_id: "x", actual_qty: input.actual_qty, note: input.note });
  if (errors) return { ok: false, errors };

  let item: OpnameItem;
  try {
    item = toPlain(
      (await adminDatabases().getDocument("erp", OPN_ITEMS_COLLECTION, id)) as unknown as OpnameItem
    );
  } catch {
    return { ok: false, errors: { _form: "Item tidak ditemukan." } };
  }

  const opname = await getOpname(item.stock_opname_id);
  if (!opname || opname.status !== "draft") {
    return { ok: false, errors: { _form: "Item hanya bisa diubah pada opname draft." } };
  }

  try {
    const doc = await adminDatabases().updateDocument({
      databaseId: "erp",
      collectionId: OPN_ITEMS_COLLECTION,
      documentId: id,
      data: {
        actual_qty: input.actual_qty,
        difference: input.actual_qty - Number(item.system_qty),
        note: input.note?.trim() || null,
      },
    });
    return { ok: true, data: toPlain(doc as unknown as OpnameItem) };
  } catch (error) {
    console.error("updateOpnameItem failed:", error);
    return toAppwriteError("update_opname_item_failed");
  }
}

export async function deleteOpnameItem(id: string, userId: string): Promise<Result<null>> {
  let item: OpnameItem;
  try {
    item = toPlain(
      (await adminDatabases().getDocument("erp", OPN_ITEMS_COLLECTION, id)) as unknown as OpnameItem
    );
  } catch {
    return { ok: false, errors: { _form: "Item tidak ditemukan." } };
  }

  const opname = await getOpname(item.stock_opname_id);
  if (!opname || opname.status !== "draft") {
    return { ok: false, errors: { _form: "Item hanya bisa dihapus pada opname draft." } };
  }

  try {
    await adminDatabases().deleteDocument("erp", OPN_ITEMS_COLLECTION, id);
    return { ok: true, data: null };
  } catch (error) {
    console.error("deleteOpnameItem failed:", error);
    return toAppwriteError("delete_opname_item_failed");
  }
}

export type PostOpnameResult = {
  movement_count: number;
  updated_products: { product_id: string; duplicate?: boolean; current_stock?: number }[];
};

export async function postOpname(id: string, userId: string): Promise<Result<PostOpnameResult>> {
  const functions = new Functions(getAdminClient());
  let run;
  try {
    run = await functions.createExecution({
      functionId: "post-stock-opname",
      body: JSON.stringify({ stock_opname_id: id, created_by: userId, allow_negative: true }),
      async: false,
    });
  } catch (error) {
    console.error("postOpname execution failed:", error);
    return toAppwriteError("post_opname_failed");
  }

  const statusCode = (run as unknown as { responseStatusCode?: number }).responseStatusCode;
  const body = (run as unknown as { responseBody?: string }).responseBody ?? "";
  let parsed: { ok?: boolean; errors?: Record<string, string> } | null = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = null;
  }

  if (statusCode === 200 && parsed?.ok) {
    return {
      ok: true,
      data: {
        movement_count: (parsed as unknown as { movement_count?: number }).movement_count ?? 0,
        updated_products: (parsed as unknown as { updated_products?: PostOpnameResult["updated_products"] }).updated_products ?? [],
      },
    };
  }

  const errors = parsed?.errors ?? {};
  if (statusCode === 409) return { ok: false, errors };
  if (statusCode === 404) return { ok: false, errors };
  if (statusCode === 400) return { ok: false, errors };
  return {
    ok: false,
    errors: { _form: errors._form ?? "Gagal mem-posting opname." },
    code: "post_opname_failed",
  };
}
