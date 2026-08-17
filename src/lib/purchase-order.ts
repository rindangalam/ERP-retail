import "server-only";
import { ID, Query } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";
import { listSuppliers } from "./supplier";
import {
  validatePurchaseOrderInput,
  type PurchaseOrderInput,
} from "./purchase-order-validation";

export const PURCHASE_ORDERS_DATABASE_ID = "erp";
export const PURCHASE_ORDERS_COLLECTION = "purchase_orders";
export const PURCHASE_ORDER_ITEMS_COLLECTION = "purchase_order_items";

export type PurchaseOrderStatus = "draft" | "ordered" | "partial" | "received" | "cancelled";

type AppwriteDoc = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: unknown;
};

export type PurchaseOrder = AppwriteDoc & {
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_date: string | null;
  status: PurchaseOrderStatus;
  total_amount: number;
  notes: string | null;
  created_by: string;
  created_at: string;
};

export type PurchaseOrderItem = AppwriteDoc & {
  purchase_order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type PurchaseOrderWithItems = PurchaseOrder & {
  supplier_name: string;
  items: PurchaseOrderItem[];
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; code?: string };

function nowIso(): string {
  return new Date().toISOString();
}

function toPlain<T extends Record<string, unknown>>(doc: T): T {
  return { ...doc };
}

export async function listPurchaseOrders(): Promise<PurchaseOrderWithItems[]> {
  const [poResult, supplierResult, itemsResult] = await Promise.all([
    adminDatabases().listDocuments(PURCHASE_ORDERS_DATABASE_ID, PURCHASE_ORDERS_COLLECTION, [
      Query.orderDesc("created_at"),
    ]),
    listSuppliers({ includeInactive: true }),
    adminDatabases().listDocuments(
      PURCHASE_ORDERS_DATABASE_ID,
      PURCHASE_ORDER_ITEMS_COLLECTION,
      []
    ),
  ]);

  const supplierName = new Map(supplierResult.map((s) => [s.$id, s.name]));
  const itemsByPo = new Map<string, PurchaseOrderItem[]>();
  for (const item of itemsResult.documents as unknown as PurchaseOrderItem[]) {
    const list = itemsByPo.get(item.purchase_order_id) ?? [];
    list.push(toPlain(item));
    itemsByPo.set(item.purchase_order_id, list);
  }

  return (poResult.documents as unknown as PurchaseOrder[]).map((po) => ({
    ...toPlain(po),
    supplier_name: supplierName.get(po.supplier_id) ?? "Supplier tidak dikenal",
    items: (itemsByPo.get(po.$id) ?? []).sort((a, b) =>
      a.product_id.localeCompare(b.product_id)
    ),
  }));
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrderWithItems | null> {
  const [poResult, itemsResult] = await Promise.all([
    adminDatabases().getDocument(PURCHASE_ORDERS_DATABASE_ID, PURCHASE_ORDERS_COLLECTION, id),
    adminDatabases().listDocuments(
      PURCHASE_ORDERS_DATABASE_ID,
      PURCHASE_ORDER_ITEMS_COLLECTION,
      [Query.equal("purchase_order_id", [id])]
    ),
  ]);

  const po = poResult as unknown as PurchaseOrder;
  const supplierName =
    (await listSuppliers({ includeInactive: true })).find(
      (s) => s.$id === po.supplier_id
    )?.name ?? "Supplier tidak dikenal";

  return {
    ...toPlain(po),
    supplier_name: supplierName,
    items: (itemsResult.documents as unknown as PurchaseOrderItem[]).map(toPlain).sort((a, b) =>
      a.product_id.localeCompare(b.product_id)
    ),
  };
}

export async function getPurchaseOrderItems(poId: string): Promise<PurchaseOrderItem[]> {
  const result = await adminDatabases().listDocuments(
    PURCHASE_ORDERS_DATABASE_ID,
    PURCHASE_ORDER_ITEMS_COLLECTION,
    [Query.equal("purchase_order_id", [poId])]
  );
  return (result.documents as unknown as PurchaseOrderItem[]).map(toPlain);
}

async function nextPoNumber(orderDate: string): Promise<string> {
  const prefix = `PO-${orderDate.replaceAll("-", "")}-`;
  const result = await adminDatabases().listDocuments(
    PURCHASE_ORDERS_DATABASE_ID,
    PURCHASE_ORDERS_COLLECTION,
    [Query.startsWith("po_number", prefix)]
  );
  return `${prefix}${String(result.total + 1).padStart(3, "0")}`;
}

export async function createPurchaseOrder(
  input: PurchaseOrderInput,
  userId: string
): Promise<Result<PurchaseOrderWithItems>> {
  const validated = validatePurchaseOrderInput(input);
  if (!validated.ok) return validated;

  const now = nowIso();
  const poNumber = await nextPoNumber(input.order_date);
  const items = input.items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.quantity * item.unit_price,
  }));
  const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);

  try {
    const poDoc = await adminDatabases().createDocument({
      databaseId: PURCHASE_ORDERS_DATABASE_ID,
      collectionId: PURCHASE_ORDERS_COLLECTION,
      documentId: ID.unique(),
      data: {
        po_number: poNumber,
        supplier_id: input.supplier_id,
        order_date: input.order_date,
        expected_date: input.expected_date || null,
        status: "draft",
        total_amount: totalAmount,
        notes: input.notes?.trim() || null,
        created_by: userId,
        created_at: now,
      },
    });

    const createdItemDocs: string[] = [];
    try {
      for (const item of items) {
        const itemDoc = await adminDatabases().createDocument({
          databaseId: PURCHASE_ORDERS_DATABASE_ID,
          collectionId: PURCHASE_ORDER_ITEMS_COLLECTION,
          documentId: ID.unique(),
          data: {
            purchase_order_id: poDoc.$id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
          },
        });
        createdItemDocs.push(itemDoc.$id);
      }
    } catch (itemError) {
      for (const itemId of createdItemDocs) {
        try {
          await adminDatabases().deleteDocument(
            PURCHASE_ORDERS_DATABASE_ID,
            PURCHASE_ORDER_ITEMS_COLLECTION,
            itemId
          );
        } catch {
          // abaikan gagal hapus item saat rollback
        }
      }
      throw itemError;
    }

    const po = poDoc as unknown as PurchaseOrder;
    return {
      ok: true,
      data: {
        ...toPlain(po),
        supplier_name: "Supplier",
        items: items.map((item, i) =>
          toPlain({ $id: createdItemDocs[i] ?? "", ...item })
        ) as unknown as PurchaseOrderItem[],
      },
    };
  } catch (error) {
    console.error("createPurchaseOrder failed:", error);
    return { ok: false, errors: {}, code: "create_po_failed" };
  }
}

export async function cancelPurchaseOrder(
  id: string,
  userId: string
): Promise<Result<PurchaseOrder>> {
  try {
    const po = await adminDatabases().getDocument(
      PURCHASE_ORDERS_DATABASE_ID,
      PURCHASE_ORDERS_COLLECTION,
      id
    );
    const status = (po as unknown as PurchaseOrder).status;
    if (status !== "draft") {
      return { ok: false, errors: {}, code: "not_draft" };
    }
    const updated = await adminDatabases().updateDocument({
      databaseId: PURCHASE_ORDERS_DATABASE_ID,
      collectionId: PURCHASE_ORDERS_COLLECTION,
      documentId: id,
      data: { status: "cancelled", updated_by: userId, updated_at: nowIso() },
    });
    return { ok: true, data: toPlain(updated as unknown as PurchaseOrder) };
  } catch (error) {
    console.error("cancelPurchaseOrder failed:", error);
    return { ok: false, errors: {}, code: "cancel_po_failed" };
  }
}
