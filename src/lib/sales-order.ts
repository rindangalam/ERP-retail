import "server-only";
import { ID, Permission, Query, Role } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";
import { listCustomers } from "./customer";
import {
  validateSalesOrderInput,
  type SalesOrderInput,
} from "./sales-order-validation";

const DATABASE_ID = "erp";
const SO_COLLECTION = "sales_orders";
const SO_ITEMS_COLLECTION = "sales_order_items";

type AppwriteDoc = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: unknown;
};

export type SalesOrderStatus = "draft" | "confirmed" | "partially_invoiced" | "invoiced" | "cancelled";

export type SalesOrder = AppwriteDoc & {
  so_number: string;
  customer_id: string;
  order_date: string;
  expected_date: string | null;
  status: SalesOrderStatus;
  total_amount: number;
  notes: string | null;
  created_by: string;
  created_at: string;
};

export type SalesOrderItem = AppwriteDoc & {
  sales_order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type SalesOrderWithItems = SalesOrder & {
  customer_name: string;
  items: SalesOrderItem[];
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; code?: string };

const SO_READ = ["admin", "sales", "finance", "warehouse"].map((label) =>
  Permission.read(Role.label(label))
);
const SO_WRITE = ["admin", "sales"].map((label) =>
  Permission.write(Role.label(label))
);

function nowIso(): string {
  return new Date().toISOString();
}

function toPlain<T extends Record<string, unknown>>(doc: T): T {
  return { ...doc };
}

export async function listSalesOrders(): Promise<SalesOrderWithItems[]> {
  const [soResult, customers] = await Promise.all([
    adminDatabases().listDocuments(DATABASE_ID, SO_COLLECTION, [Query.orderDesc("created_at")]),
    listCustomers({ includeInactive: true }),
  ]);

  const customerMap = new Map(customers.map((c) => [c.$id, c.name]));
  const itemsResult = await adminDatabases().listDocuments(DATABASE_ID, SO_ITEMS_COLLECTION, []);
  const itemsBySo = new Map<string, SalesOrderItem[]>();
  for (const item of itemsResult.documents as unknown as SalesOrderItem[]) {
    const list = itemsBySo.get(item.sales_order_id) ?? [];
    list.push(toPlain(item));
    itemsBySo.set(item.sales_order_id, list);
  }

  return (soResult.documents as unknown as SalesOrder[]).map((so) => ({
    ...toPlain(so),
    customer_name: customerMap.get(so.customer_id) ?? "—",
    items: (itemsBySo.get(so.$id) ?? []).sort((a, b) =>
      a.product_id.localeCompare(b.product_id)
    ),
  }));
}

export async function getSalesOrder(id: string): Promise<SalesOrderWithItems | null> {
  try {
    const [soResult, itemsResult] = await Promise.all([
      adminDatabases().getDocument(DATABASE_ID, SO_COLLECTION, id),
      adminDatabases().listDocuments(DATABASE_ID, SO_ITEMS_COLLECTION, [
        Query.equal("sales_order_id", [id]),
      ]),
    ]);

    const so = soResult as unknown as SalesOrder;
    const customers = await listCustomers({ includeInactive: true });
    const customerName = customers.find((c) => c.$id === so.customer_id)?.name ?? "—";

    return {
      ...toPlain(so),
      customer_name: customerName,
      items: (itemsResult.documents as unknown as SalesOrderItem[]).map(toPlain),
    };
  } catch {
    return null;
  }
}

async function nextSONumber(orderDate: string): Promise<string> {
  const prefix = `SO-${orderDate.replaceAll("-", "")}-`;
  const result = await adminDatabases().listDocuments(DATABASE_ID, SO_COLLECTION, [
    Query.startsWith("so_number", prefix),
  ]);
  return `${prefix}${String(result.total + 1).padStart(3, "0")}`;
}

export async function createSalesOrder(
  input: SalesOrderInput,
  userId: string
): Promise<Result<SalesOrderWithItems>> {
  const validated = validateSalesOrderInput(input);
  if (!validated.ok) return validated;

  const now = nowIso();
  const soNumber = await nextSONumber(input.order_date);
  const items = input.items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.quantity * item.unit_price,
  }));
  const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);

  try {
    const soDoc = await adminDatabases().createDocument({
      databaseId: DATABASE_ID,
      collectionId: SO_COLLECTION,
      documentId: ID.unique(),
      data: {
        so_number: soNumber,
        customer_id: input.customer_id,
        order_date: input.order_date,
        expected_date: input.expected_date || null,
        status: "draft",
        total_amount: totalAmount,
        notes: input.notes?.trim() || null,
        created_by: userId,
        created_at: now,
      },
      permissions: [...SO_READ, ...SO_WRITE],
    });

    const createdItemIds: string[] = [];
    try {
      for (const item of items) {
        const itemDoc = await adminDatabases().createDocument({
          databaseId: DATABASE_ID,
          collectionId: SO_ITEMS_COLLECTION,
          documentId: ID.unique(),
          data: {
            sales_order_id: soDoc.$id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
          },
        });
        createdItemIds.push(itemDoc.$id);
      }
    } catch (itemError) {
      for (const itemId of createdItemIds) {
        try {
          await adminDatabases().deleteDocument(DATABASE_ID, SO_ITEMS_COLLECTION, itemId);
        } catch {
          // rollback best-effort
        }
      }
      throw itemError;
    }

    const customers = await listCustomers({ includeInactive: true });
    const customerName = customers.find((c) => c.$id === input.customer_id)?.name ?? "—";

    const so = soDoc as unknown as SalesOrder;
    return {
      ok: true,
      data: {
        ...toPlain(so),
        customer_name: customerName,
        items: items.map((item, i) =>
          toPlain({ $id: createdItemIds[i] ?? "", ...item })
        ) as unknown as SalesOrderItem[],
      },
    };
  } catch (error) {
    console.error("createSalesOrder failed:", error);
    return { ok: false, errors: {}, code: "create_so_failed" };
  }
}

export async function confirmSalesOrder(
  id: string,
  userId: string
): Promise<Result<SalesOrder>> {
  try {
    const so = await adminDatabases().getDocument(DATABASE_ID, SO_COLLECTION, id);
    const status = (so as unknown as SalesOrder).status;
    if (status !== "draft") {
      return { ok: false, errors: {}, code: "not_draft" };
    }
    const updated = await adminDatabases().updateDocument({
      databaseId: DATABASE_ID,
      collectionId: SO_COLLECTION,
      documentId: id,
      data: { status: "confirmed", updated_by: userId, updated_at: nowIso() },
    });
    return { ok: true, data: toPlain(updated as unknown as SalesOrder) };
  } catch (error) {
    console.error("confirmSalesOrder failed:", error);
    return { ok: false, errors: {}, code: "confirm_so_failed" };
  }
}

export async function cancelSalesOrder(
  id: string,
  userId: string
): Promise<Result<SalesOrder>> {
  try {
    const so = await adminDatabases().getDocument(DATABASE_ID, SO_COLLECTION, id);
    const status = (so as unknown as SalesOrder).status;
    if (status !== "draft") {
      return { ok: false, errors: {}, code: "not_draft" };
    }
    const updated = await adminDatabases().updateDocument({
      databaseId: DATABASE_ID,
      collectionId: SO_COLLECTION,
      documentId: id,
      data: { status: "cancelled", updated_by: userId, updated_at: nowIso() },
    });
    return { ok: true, data: toPlain(updated as unknown as SalesOrder) };
  } catch (error) {
    console.error("cancelSalesOrder failed:", error);
    return { ok: false, errors: {}, code: "cancel_so_failed" };
  }
}
