import "server-only";
import { Client, Functions, ID, Query } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";
import { listCustomers } from "./customer";
import { listProducts } from "./inventory";
import {
  validateSalesInvoiceInput,
  type SalesInvoiceInput,
} from "./sales-invoice-validation";

const DATABASE_ID = "erp";
const SI_COLLECTION = "sales_invoices";
const SI_ITEMS_COLLECTION = "sales_invoice_items";
const SO_COLLECTION = "sales_orders";
const SO_ITEMS_COLLECTION = "sales_order_items";

type AppwriteDoc = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: unknown;
};

export type SalesInvoiceStatus = "draft" | "unpaid" | "partial" | "paid" | "cancelled";

export type SalesInvoice = AppwriteDoc & {
  invoice_number: string;
  sales_order_id: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  discount: number | null;
  tax: number | null;
  total_amount: number;
  status: SalesInvoiceStatus;
  stock_override: boolean | null;
  override_by: string | null;
  override_note: string | null;
  created_by: string;
  created_at: string;
  posted_by: string | null;
  posted_at: string | null;
};

export type SalesInvoiceItem = AppwriteDoc & {
  sales_invoice_id: string;
  sales_order_item_id: string | null;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type SalesInvoiceWithItems = SalesInvoice & {
  customer_name: string;
  so_number: string;
  items: (SalesInvoiceItem & { product_name: string; sku: string })[];
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; code?: string };

function getAdminClient() {
  return new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);
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
  const db = adminDatabases();
  for (;;) {
    const result = await db.listDocuments(DATABASE_ID, coll, [
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

export async function listSalesInvoices(): Promise<SalesInvoiceWithItems[]> {
  const db = adminDatabases();
  const [siResult, customers, soResult, products] = await Promise.all([
    db.listDocuments(DATABASE_ID, SI_COLLECTION, [Query.orderDesc("created_at")]),
    listCustomers({ includeInactive: true }),
    db.listDocuments(DATABASE_ID, SO_COLLECTION, []),
    listProducts({ includeInactive: true }),
  ]);

  const customerMap = new Map(customers.map((c) => [c.$id, c.name]));
  const soMap = new Map((soResult.documents as unknown as { $id: string; so_number: string }[]).map((s) => [s.$id, s.so_number]));
  const productMap = new Map(products.map((p) => [p.$id, { name: p.name, sku: p.sku }]));

  const results: SalesInvoiceWithItems[] = [];
  for (const si of siResult.documents as unknown as SalesInvoice[]) {
    const items = (await listByField(SI_ITEMS_COLLECTION, "sales_invoice_id", si.$id)) as unknown as SalesInvoiceItem[];
    results.push({
      ...toPlain(si),
      customer_name: customerMap.get(si.customer_id) ?? "—",
      so_number: soMap.get(si.sales_order_id) ?? "—",
      items: items.map((item) => {
        const p = productMap.get(item.product_id);
        return { ...toPlain(item), product_name: p?.name ?? "—", sku: p?.sku ?? "" };
      }),
    });
  }
  return results;
}

export async function getSalesInvoice(id: string): Promise<SalesInvoiceWithItems | null> {
  try {
    const db = adminDatabases();
    const [siResult, customers, soResult, products] = await Promise.all([
      db.getDocument(DATABASE_ID, SI_COLLECTION, id),
      listCustomers({ includeInactive: true }),
      db.listDocuments(DATABASE_ID, SO_COLLECTION, []),
      listProducts({ includeInactive: true }),
    ]);

    const si = siResult as unknown as SalesInvoice;
    const customerMap = new Map(customers.map((c) => [c.$id, c.name]));
    const soMap = new Map((soResult.documents as unknown as { $id: string; so_number: string }[]).map((s) => [s.$id, s.so_number]));
    const productMap = new Map(products.map((p) => [p.$id, { name: p.name, sku: p.sku }]));

    const items = (await listByField(SI_ITEMS_COLLECTION, "sales_invoice_id", si.$id)) as unknown as SalesInvoiceItem[];
    return {
      ...toPlain(si),
      customer_name: customerMap.get(si.customer_id) ?? "—",
      so_number: soMap.get(si.sales_order_id) ?? "—",
      items: items.map((item) => {
        const p = productMap.get(item.product_id);
        return { ...toPlain(item), product_name: p?.name ?? "—", sku: p?.sku ?? "" };
      }),
    };
  } catch {
    return null;
  }
}

async function nextInvoiceNumber(invoiceDate: string): Promise<string> {
  const prefix = `INV-${invoiceDate.replaceAll("-", "")}-`;
  const result = await adminDatabases().listDocuments(DATABASE_ID, SI_COLLECTION, [
    Query.startsWith("invoice_number", prefix),
  ]);
  return `${prefix}${String(result.total + 1).padStart(3, "0")}`;
}

export async function listConfirmedSOs(): Promise<{ $id: string; so_number: string; customer_id: string; customer_name: string; total_amount: number; items: { product_id: string; quantity: number; unit_price: number; line_total: number; sales_order_item_id: string }[] }[]> {
  const db = adminDatabases();
  const [soResult, customers] = await Promise.all([
    db.listDocuments(DATABASE_ID, SO_COLLECTION, [
      Query.equal("status", ["confirmed"]),
    ]),
    listCustomers({ includeInactive: true }),
  ]);

  const customerMap = new Map(customers.map((c) => [c.$id, c.name]));
  const results = [];

  for (const so of soResult.documents as unknown as { $id: string; so_number: string; customer_id: string; total_amount: number }[]) {
    const items = (await listByField(SO_ITEMS_COLLECTION, "sales_order_id", so.$id)) as unknown as { $id: string; product_id: string; quantity: number; unit_price: number; line_total: number }[];
    results.push({
      $id: so.$id,
      so_number: so.so_number,
      customer_id: so.customer_id,
      customer_name: customerMap.get(so.customer_id) ?? "—",
      total_amount: so.total_amount,
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        sales_order_item_id: item.$id,
      })),
    });
  }
  return results;
}

export async function createSalesInvoice(
  input: SalesInvoiceInput,
  userId: string
): Promise<Result<SalesInvoiceWithItems>> {
  const validated = validateSalesInvoiceInput(input);
  if (!validated.ok) return validated;

  const now = nowIso();
  const invoiceNumber = await nextInvoiceNumber(input.invoice_date);
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discount = input.discount ?? 0;
  const tax = input.tax ?? 0;
  const totalAmount = subtotal - discount + tax;

  try {
    const db = adminDatabases();
    const siDoc = await db.createDocument({
      databaseId: DATABASE_ID,
      collectionId: SI_COLLECTION,
      documentId: ID.unique(),
      data: {
        invoice_number: invoiceNumber,
        sales_order_id: input.sales_order_id,
        customer_id: input.customer_id,
        invoice_date: input.invoice_date,
        due_date: input.due_date,
        subtotal,
        discount,
        tax,
        total_amount: totalAmount,
        status: "draft",
        stock_override: input.stock_override || null,
        override_by: input.stock_override ? userId : null,
        override_note: input.override_note?.trim() || null,
        created_by: userId,
        created_at: now,
      },
    });

    const createdItemIds: string[] = [];
    try {
      for (const item of input.items) {
        const itemDoc = await db.createDocument({
          databaseId: DATABASE_ID,
          collectionId: SI_ITEMS_COLLECTION,
          documentId: ID.unique(),
          data: {
            sales_invoice_id: siDoc.$id,
            sales_order_item_id: item.sales_order_item_id || null,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.quantity * item.unit_price,
          },
        });
        createdItemIds.push(itemDoc.$id);
      }
    } catch (itemError) {
      for (const itemId of createdItemIds) {
        try {
          await db.deleteDocument(DATABASE_ID, SI_ITEMS_COLLECTION, itemId);
        } catch {
          // rollback best-effort
        }
      }
      throw itemError;
    }

    const [customers, products] = await Promise.all([
      listCustomers({ includeInactive: true }),
      listProducts({ includeInactive: true }),
    ]);
    const customerName = customers.find((c) => c.$id === input.customer_id)?.name ?? "—";
    const productMap = new Map(products.map((p) => [p.$id, { name: p.name, sku: p.sku }]));
    const soResult = await db.getDocument(DATABASE_ID, SO_COLLECTION, input.sales_order_id) as unknown as { so_number: string };

    const si = siDoc as unknown as SalesInvoice;
    return {
      ok: true,
      data: {
        ...toPlain(si),
        customer_name: customerName,
        so_number: soResult.so_number,
        items: input.items.map((item, i) => {
          const p = productMap.get(item.product_id);
          return toPlain({
            $id: createdItemIds[i] ?? "",
            sales_invoice_id: siDoc.$id,
            sales_order_item_id: item.sales_order_item_id || null,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.quantity * item.unit_price,
            product_name: p?.name ?? "—",
            sku: p?.sku ?? "",
          });
        }) as unknown as SalesInvoiceWithItems["items"],
      },
    };
  } catch (error) {
    console.error("createSalesInvoice failed:", error);
    return { ok: false, errors: {}, code: "create_si_failed" };
  }
}

export async function postSalesInvoice(
  siId: string,
  userId: string
): Promise<Result<{ movement_count: number; journal_entry_id: string }>> {
  const functions = new Functions(getAdminClient());
  let run;
  try {
    run = await functions.createExecution({
      functionId: "post-stock-opname",
      body: JSON.stringify({ type: "sales_invoice", sales_invoice_id: siId, created_by: userId }),
      async: false,
    });
  } catch (error) {
    console.error("postSalesInvoice execution failed:", error);
    return { ok: false, errors: { _form: "Gagal menjalankan Function." }, code: "post_si_failed" };
  }

  const statusCode = (run as unknown as { responseStatusCode?: number }).responseStatusCode;
  const body = (run as unknown as { responseBody?: string }).responseBody ?? "";
  let parsed: { ok?: boolean; errors?: Record<string, string>; movement_count?: number; journal_entry_id?: string } | null = null;
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
        journal_entry_id: parsed.journal_entry_id ?? "",
      },
    };
  }

  const errors = parsed?.errors ?? {};
  if ([400, 404, 409].includes(statusCode ?? 0)) return { ok: false, errors };
  return { ok: false, errors: { _form: errors._form ?? "Gagal mem-posting invoice." }, code: "post_si_failed" };
}

export async function cancelSalesInvoice(
  siId: string,
): Promise<Result<SalesInvoice>> {
  try {
    const db = adminDatabases();
    const si = await db.getDocument(DATABASE_ID, SI_COLLECTION, siId) as unknown as SalesInvoice;
    if (si.status !== "draft") {
      return { ok: false, errors: {}, code: "not_draft" };
    }
    const updated = await db.updateDocument({
      databaseId: DATABASE_ID,
      collectionId: SI_COLLECTION,
      documentId: siId,
      data: { status: "cancelled" },
    });
    return { ok: true, data: toPlain(updated as unknown as SalesInvoice) };
  } catch (error) {
    console.error("cancelSalesInvoice failed:", error);
    return { ok: false, errors: {}, code: "cancel_si_failed" };
  }
}
