import "server-only";
import { Client, Databases, Functions, ID, Permission, Query, Role } from "node-appwrite";
import { listSuppliers } from "./supplier";
import type { PurchaseOrderWithItems } from "./purchase-order";
import type { GoodsReceiptWithItems } from "./goods-receipt";
import {
  validatePurchaseReturnInput,
  type PurchaseReturnInput,
} from "./purchase-return-validation";

const DATABASE_ID = "erp";
const PR_COLLECTION = "purchase_returns";
const PR_ITEMS_COLLECTION = "purchase_return_items";
const PO_COLLECTION = "purchase_orders";
const PO_ITEMS_COLLECTION = "purchase_order_items";
const GR_COLLECTION = "goods_receipts";
const GR_ITEMS_COLLECTION = "goods_receipt_items";
const PRODUCTS_COLLECTION = "products";

const PR_READ = ["admin", "purchasing", "finance"];

type AppwriteDoc = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: unknown;
};

export type PurchaseReturnStatus = "draft" | "posted" | "cancelled";

export type PurchaseReturn = AppwriteDoc & {
  return_number: string;
  supplier_id: string;
  purchase_order_id: string | null;
  return_date: string;
  status: PurchaseReturnStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  posted_by: string | null;
  posted_at: string | null;
};

export type PurchaseReturnItem = AppwriteDoc & {
  purchase_return_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
};

export type PurchaseReturnWithItems = PurchaseReturn & {
  po_number: string;
  supplier_name: string;
  items: (PurchaseReturnItem & {
    sku: string;
    product_name: string;
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

export async function listPurchaseReturns(): Promise<PurchaseReturnWithItems[]> {
  const db = adminDatabases();
  const [prResult, poResult, grResult] = await Promise.all([
    db.listDocuments(DATABASE_ID, PR_COLLECTION, [Query.orderDesc("created_at")]),
    db.listDocuments(DATABASE_ID, PO_COLLECTION, []),
    db.listDocuments(DATABASE_ID, GR_COLLECTION, []),
  ]);

  const poMap = new Map((poResult.documents as unknown as PurchaseOrderWithItems[]).map((po) => [po.$id, po]));
  const grMap = new Map((grResult.documents as unknown as GoodsReceiptWithItems[]).map((gr) => [gr.$id, gr]));
  const suppliers = await listSuppliers({ includeInactive: true });
  const supplierMap = new Map(suppliers.map((s) => [s.$id, s.name]));

  // Fetch products for name/sku
  const productsResult = await db.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, []);
  const productMap = new Map(productsResult.documents.map((p: unknown) => [(p as { $id: string }).$id, p as { sku: string; name: string }]));

  const results: PurchaseReturnWithItems[] = [];
  for (const pr of prResult.documents as unknown as PurchaseReturn[]) {
    const po = pr.purchase_order_id ? poMap.get(pr.purchase_order_id) : undefined;
    const items = (await listByField(PR_ITEMS_COLLECTION, "purchase_return_id", pr.$id)) as unknown as PurchaseReturnItem[];

    results.push({
      ...toPlain(pr),
      po_number: po?.po_number ?? "—",
      supplier_name: supplierMap.get(pr.supplier_id) ?? "—",
      items: items.map((item) => {
        const product = productMap.get(item.product_id);
        return {
          ...toPlain(item),
          sku: product?.sku ?? "",
          product_name: product?.name ?? "",
        };
      }),
    });
  }
  return results;
}

export type GRForPR = GoodsReceiptWithItems & { supplier_id: string };

export async function listGRsForPR(): Promise<GRForPR[]> {
  const db = adminDatabases();
  const [grResult, suppliers, poResult] = await Promise.all([
    db.listDocuments(DATABASE_ID, GR_COLLECTION, [
      Query.equal("status", ["posted"]),
    ]),
    listSuppliers({ includeInactive: true }),
    db.listDocuments(DATABASE_ID, PO_COLLECTION, []),
  ]);

  const supplierMap = new Map(suppliers.map((s) => [s.$id, s.name]));
  const poMap = new Map((poResult.documents as unknown as PurchaseOrderWithItems[]).map((po) => [po.$id, po]));

  const results: GRForPR[] = [];
  for (const gr of grResult.documents as unknown as GoodsReceiptWithItems[]) {
    const po = gr.purchase_order_id ? poMap.get(gr.purchase_order_id) : undefined;
    const items = (await listByField(GR_ITEMS_COLLECTION, "goods_receipt_id", gr.$id));
    const poItems = po?.items ?? [];
    const poItemsMap = new Map(poItems.map((pi) => [pi.$id, pi]));

    // Fetch product info
    const productsResult = await db.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, []);
    const productMap = new Map(productsResult.documents.map((p: unknown) => [(p as { $id: string }).$id, p as { sku: string; name: string; cost_price: number }]));

    results.push({
      ...toPlain(gr),
      po_number: po?.po_number ?? "—",
      supplier_id: po?.supplier_id ?? "",
      supplier_name: supplierMap.get(po?.supplier_id ?? "") ?? "—",
      items: items.map((item: unknown) => {
        const gi = item as { $id: string; purchase_order_item_id: string; product_id: string; quantity_received: number };
        const poItem = poItemsMap.get(gi.purchase_order_item_id);
        const product = productMap.get(gi.product_id);
        return {
          ...toPlain(item as Record<string, unknown>),
          sku: product?.sku ?? "",
          product_name: product?.name ?? "",
          unit_price: poItem?.unit_price ?? product?.cost_price ?? 0,
          po_quantity: poItem?.quantity ?? 0,
        };
      }) as GRForPR["items"],
    });
  }
  return results;
}

export async function createPurchaseReturn(
  input: PurchaseReturnInput,
  userId: string
): Promise<Result<PurchaseReturn>> {
  const validated = validatePurchaseReturnInput(input);
  if (!validated.ok) return validated;

  const db = adminDatabases();

  // Generate return number
  const prefix = `PR-${input.return_date.replaceAll("-", "")}-`;
  const existingPR = await db.listDocuments(DATABASE_ID, PR_COLLECTION, [
    Query.startsWith("return_number", prefix),
  ]);
  const returnNumber = `${prefix}${String(existingPR.total + 1).padStart(3, "0")}`;

  const now = nowIso();
  try {
    const prDoc = await db.createDocument({
      databaseId: DATABASE_ID,
      collectionId: PR_COLLECTION,
      documentId: ID.unique(),
      data: {
        return_number: returnNumber,
        supplier_id: input.supplier_id,
        purchase_order_id: input.purchase_order_id || null,
        return_date: input.return_date,
        status: "draft",
        notes: input.notes?.trim() || null,
        created_by: userId,
        created_at: now,
      },
      permissions: PR_READ.map((label) => Permission.read(Role.label(label))),
    });

    const createdItemIds: string[] = [];
    try {
      for (const item of input.items) {
        const itemDoc = await db.createDocument({
          databaseId: DATABASE_ID,
          collectionId: PR_ITEMS_COLLECTION,
          documentId: ID.unique(),
          data: {
            purchase_return_id: prDoc.$id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          },
        });
        createdItemIds.push(itemDoc.$id);
      }
    } catch (err) {
      for (const id of createdItemIds) {
        try {
          await db.deleteDocument(DATABASE_ID, PR_ITEMS_COLLECTION, id);
        } catch {
          // rollback best-effort
        }
      }
      throw err;
    }

    return { ok: true, data: toPlain(prDoc as unknown as PurchaseReturn) };
  } catch (error) {
    console.error("createPurchaseReturn failed:", error);
    return { ok: false, errors: {}, code: "create_pr_failed" };
  }
}

export async function postPurchaseReturn(
  prId: string,
  userId: string
): Promise<Result<{ movement_count: number; new_po_status: string }>> {
  const functions = new Functions(getAdminClient());
  let run;
  try {
    run = await functions.createExecution({
      functionId: "post-stock-opname",
      body: JSON.stringify({ type: "purchase_return", purchase_return_id: prId, created_by: userId }),
      async: false,
    });
  } catch (error) {
    console.error("postPurchaseReturn execution failed:", error);
    return { ok: false, errors: { _form: "Gagal menjalankan Function." }, code: "post_pr_failed" };
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
  return { ok: false, errors: { _form: errors._form ?? "Gagal mem-posting PR." }, code: "post_pr_failed" };
}

export async function cancelPurchaseReturn(
  prId: string,
  userId: string
): Promise<Result<PurchaseReturn>> {
  try {
    const db = adminDatabases();
    const pr = await db.getDocument(DATABASE_ID, PR_COLLECTION, prId) as unknown as PurchaseReturn;
    if (pr.status !== "draft") {
      return { ok: false, errors: {}, code: "not_draft" };
    }
    const updated = await db.updateDocument({
      databaseId: DATABASE_ID,
      collectionId: PR_COLLECTION,
      documentId: prId,
      data: { status: "cancelled", updated_by: userId, updated_at: nowIso() },
    });
    return { ok: true, data: toPlain(updated as unknown as PurchaseReturn) };
  } catch (error) {
    console.error("cancelPurchaseReturn failed:", error);
    return { ok: false, errors: {}, code: "cancel_pr_failed" };
  }
}
