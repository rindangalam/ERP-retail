import "server-only";
import { Client, Databases, Functions, ID, Permission, Query, Role } from "node-appwrite";
import { listSuppliers } from "./supplier";
import type { PurchaseOrderWithItems } from "./purchase-order";
import {
  validateGoodsReceiptInput,
  type GoodsReceiptInput,
} from "./goods-receipt-validation";

const DATABASE_ID = "erp";
const GR_COLLECTION = "goods_receipts";
const GR_ITEMS_COLLECTION = "goods_receipt_items";
const PO_COLLECTION = "purchase_orders";
const PO_ITEMS_COLLECTION = "purchase_order_items";
const PRODUCTS_COLLECTION = "products";

const GR_READ = ["admin", "warehouse", "purchasing", "finance"];

type AppwriteDoc = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: unknown;
};

export type GoodsReceiptStatus = "draft" | "posted" | "cancelled";

export type GoodsReceipt = AppwriteDoc & {
  gr_number: string;
  purchase_order_id: string;
  received_date: string;
  status: GoodsReceiptStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  posted_by: string | null;
  posted_at: string | null;
};

export type GoodsReceiptItem = AppwriteDoc & {
  goods_receipt_id: string;
  purchase_order_item_id: string;
  product_id: string;
  quantity_received: number;
};

export type GoodsReceiptWithItems = GoodsReceipt & {
  po_number: string;
  supplier_name: string;
  items: (GoodsReceiptItem & {
    sku: string;
    product_name: string;
    unit_price: number;
    po_quantity: number;
  })[];
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; code?: string };

function getAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);
  return client;
}

function adminDatabases() {
  return new Databases(getAdminClient());
}

function nowIso(): string {
  return new Date().toISOString();
}

function toPlain<T extends Record<string, unknown>>(doc: T): T {
  return { ...doc };
}

async function listByField(coll: string, field: string, value: string): Promise<unknown[]> {
  const all: unknown[] = [];
  let offset = 0;
  for (;;) {
    const result = await adminDatabases().listDocuments(DATABASE_ID, coll, [
      Query.equal(field, [value]),
      Query.limit(100),
      Query.offset(offset),
    ]);
    all.push(...result.documents);
    if (result.documents.length < 100) break;
    offset += 100;
  }
  return all;
}

export async function listGoodsReceipts(): Promise<GoodsReceiptWithItems[]> {
  const db = adminDatabases();
  const [grResult, poResult] = await Promise.all([
    db.listDocuments(DATABASE_ID, GR_COLLECTION, [Query.orderDesc("created_at")]),
    db.listDocuments(DATABASE_ID, PO_COLLECTION, []),
  ]);

  const poMap = new Map((poResult.documents as unknown as PurchaseOrderWithItems[]).map((po) => [po.$id, po]));
  const suppliers = await listSuppliers({ includeInactive: true });
  const supplierMap = new Map(suppliers.map((s) => [s.$id, s.name]));

  const results: GoodsReceiptWithItems[] = [];
  for (const gr of grResult.documents as unknown as GoodsReceipt[]) {
    const po = poMap.get(gr.purchase_order_id);
    const items = (await listByField(GR_ITEMS_COLLECTION, "goods_receipt_id", gr.$id)) as unknown as GoodsReceiptItem[];
    const poItems = po?.items ?? [];
    const poItemsMap = new Map(poItems.map((pi) => [pi.$id, pi]));

    results.push({
      ...toPlain(gr),
      po_number: po?.po_number ?? "—",
      supplier_name: supplierMap.get(po?.supplier_id ?? "") ?? "—",
      items: items.map((item) => {
        const poItem = poItemsMap.get(item.purchase_order_item_id);
        return {
          ...toPlain(item),
          sku: "",
          product_name: "",
          unit_price: poItem?.unit_price ?? 0,
          po_quantity: poItem?.quantity ?? 0,
        };
      }),
    });
  }
  return results;
}

export async function listPOsForGR(): Promise<PurchaseOrderWithItems[]> {
  const db = adminDatabases();
  const [poResult, suppliers] = await Promise.all([
    db.listDocuments(DATABASE_ID, PO_COLLECTION, [
      Query.equal("status", ["ordered"]),
    ]),
    listSuppliers({ includeInactive: true }),
  ]);

  const supplierMap = new Map(suppliers.map((s) => [s.$id, s.name]));

  const results: PurchaseOrderWithItems[] = [];
  for (const po of poResult.documents as unknown as PurchaseOrderWithItems[]) {
    const items = (await listByField(PO_ITEMS_COLLECTION, "purchase_order_id", po.$id));
    results.push({
      ...toPlain(po),
      supplier_name: supplierMap.get(po.supplier_id) ?? "—",
      items: items.map((item: unknown) => toPlain(item as Record<string, unknown>)) as PurchaseOrderWithItems["items"],
    });
  }
  return results;
}

export async function createGoodsReceipt(
  input: GoodsReceiptInput,
  userId: string
): Promise<Result<GoodsReceipt>> {
  const validated = validateGoodsReceiptInput(input);
  if (!validated.ok) return validated;

  const db = adminDatabases();
  const po = await db.getDocument(DATABASE_ID, PO_COLLECTION, input.purchase_order_id) as unknown as PurchaseOrderWithItems;

  // Generate GR number
  const prefix = `GR-${input.received_date.replaceAll("-", "")}-`;
  const existingGR = await db.listDocuments(DATABASE_ID, GR_COLLECTION, [
    Query.startsWith("gr_number", prefix),
  ]);
  const grNumber = `${prefix}${String(existingGR.total + 1).padStart(3, "0")}`;

  const now = nowIso();
  try {
    const grDoc = await db.createDocument({
      databaseId: DATABASE_ID,
      collectionId: GR_COLLECTION,
      documentId: ID.unique(),
      data: {
        gr_number: grNumber,
        purchase_order_id: input.purchase_order_id,
        received_date: input.received_date,
        status: "draft",
        notes: input.notes?.trim() || null,
        created_by: userId,
        created_at: now,
      },
      permissions: GR_READ.map((label) => Permission.read(Role.label(label))),
    });

    const createdItemIds: string[] = [];
    try {
      for (const item of input.items) {
        const itemDoc = await db.createDocument({
          databaseId: DATABASE_ID,
          collectionId: GR_ITEMS_COLLECTION,
          documentId: ID.unique(),
          data: {
            goods_receipt_id: grDoc.$id,
            purchase_order_item_id: item.purchase_order_item_id,
            product_id: item.product_id,
            quantity_received: item.quantity_received,
          },
        });
        createdItemIds.push(itemDoc.$id);
      }
    } catch (err) {
      for (const id of createdItemIds) {
        try {
          await db.deleteDocument(DATABASE_ID, GR_ITEMS_COLLECTION, id);
        } catch {
          // rollback best-effort
        }
      }
      throw err;
    }

    return { ok: true, data: toPlain(grDoc as unknown as GoodsReceipt) };
  } catch (error) {
    console.error("createGoodsReceipt failed:", error);
    return { ok: false, errors: {}, code: "create_gr_failed" };
  }
}

export async function postGoodsReceipt(
  grId: string,
  userId: string
): Promise<Result<{ movement_count: number; new_po_status: string }>> {
  const functions = new Functions(getAdminClient());
  let run;
  try {
    run = await functions.createExecution({
      functionId: "post-stock-opname",
      body: JSON.stringify({ type: "goods_receipt", goods_receipt_id: grId, created_by: userId }),
      async: false,
    });
  } catch (error) {
    console.error("postGoodsReceipt execution failed:", error);
    return { ok: false, errors: { _form: "Gagal menjalankan Function." }, code: "post_gr_failed" };
  }

  const statusCode = (run as unknown as { responseStatusCode?: number }).responseStatusCode;
  const body = (run as unknown as { responseBody?: string }).responseBody ?? "";
  let parsed: { ok?: boolean; errors?: Record<string, string>; movement_count?: number; new_po_status?: string } | null = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = null;
  }

  if (statusCode === 200 && parsed?.ok) {
    return {
      ok: true,
      data: {
        movement_count: parsed.movement_count ?? 0,
        new_po_status: parsed.new_po_status ?? "unknown",
      },
    };
  }

  const errors = parsed?.errors ?? {};
  if ([400, 404, 409].includes(statusCode ?? 0)) return { ok: false, errors };
  return { ok: false, errors: { _form: errors._form ?? "Gagal mem-posting GR." }, code: "post_gr_failed" };
}

export async function cancelGoodsReceipt(
  grId: string,
  userId: string
): Promise<Result<GoodsReceipt>> {
  try {
    const db = adminDatabases();
    const gr = await db.getDocument(DATABASE_ID, GR_COLLECTION, grId) as unknown as GoodsReceipt;
    if (gr.status !== "draft") {
      return { ok: false, errors: {}, code: "not_draft" };
    }
    const updated = await db.updateDocument({
      databaseId: DATABASE_ID,
      collectionId: GR_COLLECTION,
      documentId: grId,
      data: { status: "cancelled", updated_by: userId, updated_at: nowIso() },
    });
    return { ok: true, data: toPlain(updated as unknown as GoodsReceipt) };
  } catch (error) {
    console.error("cancelGoodsReceipt failed:", error);
    return { ok: false, errors: {}, code: "cancel_gr_failed" };
  }
}
