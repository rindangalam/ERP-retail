import "server-only";
import { Client, Functions, ID, Query } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";
import { listCustomers } from "./customer";
import { listProducts } from "./inventory";

const DATABASE_ID = "erp";
const SR_COLLECTION = "sales_returns";
const SRI_COLLECTION = "sales_return_items";
const SI_COLLECTION = "sales_invoices";
const SII_COLLECTION = "sales_invoice_items";

type AppwriteDoc = { $id: string; $createdAt: string; $updatedAt: string; [key: string]: unknown };

export type SalesReturnStatus = "draft" | "posted" | "cancelled";

export type SalesReturn = AppwriteDoc & {
  return_number: string; sales_invoice_id: string; customer_id: string;
  return_date: string; status: SalesReturnStatus; notes: string | null;
  created_by: string; created_at: string; posted_by: string | null; posted_at: string | null;
};

export type SalesReturnItem = AppwriteDoc & {
  sales_return_id: string; sales_invoice_item_id: string | null;
  product_id: string; quantity: number; unit_price: number;
};

export type SalesReturnWithItems = SalesReturn & {
  invoice_number: string; customer_name: string; total_returned: number;
  items: (SalesReturnItem & { product_name: string; sku: string })[];
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; code?: string };

function nowIso(): string { return new Date().toISOString(); }
function toPlain<T extends Record<string, unknown>>(doc: T): T { return { ...doc }; }

async function listByField(coll: string, field: string, value: string): Promise<unknown[]> {
  const all: unknown[] = [];
  let offset = 0;
  const db = adminDatabases();
  for (;;) {
    const result = await db.listDocuments(DATABASE_ID, coll, [
      Query.equal(field, [value]), Query.limit(100), Query.offset(offset),
    ]);
    all.push(...result.documents);
    if (result.documents.length < 100) break;
    offset += 100;
  }
  return all;
}

export async function listSalesReturns(): Promise<SalesReturnWithItems[]> {
  const db = adminDatabases();
  const [srResult, customers, products, invoices] = await Promise.all([
    db.listDocuments(DATABASE_ID, SR_COLLECTION, [Query.orderDesc("created_at")]),
    listCustomers({ includeInactive: true }),
    listProducts({ includeInactive: true }),
    db.listDocuments(DATABASE_ID, SI_COLLECTION, [Query.limit(100)]),
  ]);
  const customerMap = new Map(customers.map((c) => [c.$id, c.name]));
  const productMap = new Map(products.map((p) => [p.$id, { name: p.name, sku: p.sku }]));
  const invoiceMap = new Map(
    (invoices.documents as unknown as { $id: string; invoice_number: string }[]).map((i) => [i.$id, i.invoice_number])
  );
  const results: SalesReturnWithItems[] = [];
  for (const sr of srResult.documents as unknown as SalesReturn[]) {
    const items = (await listByField(SRI_COLLECTION, "sales_return_id", sr.$id)) as unknown as SalesReturnItem[];
    results.push({
      ...toPlain(sr),
      invoice_number: invoiceMap.get(sr.sales_invoice_id) ?? "—",
      customer_name: customerMap.get(sr.customer_id) ?? "—",
      total_returned: items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
      items: items.map((item) => {
        const p = productMap.get(item.product_id);
        return { ...toPlain(item), product_name: p?.name ?? "—", sku: p?.sku ?? "" };
      }),
    });
  }
  return results;
}

export async function getSalesReturn(id: string): Promise<SalesReturnWithItems | null> {
  try {
    const db = adminDatabases();
    const [srResult, customers, products, invoices] = await Promise.all([
      db.getDocument(DATABASE_ID, SR_COLLECTION, id),
      listCustomers({ includeInactive: true }),
      listProducts({ includeInactive: true }),
      db.listDocuments(DATABASE_ID, SI_COLLECTION, [Query.limit(100)]),
    ]);
    const sr = srResult as unknown as SalesReturn;
    const customerMap = new Map(customers.map((c) => [c.$id, c.name]));
    const productMap = new Map(products.map((p) => [p.$id, { name: p.name, sku: p.sku }]));
    const invoiceMap = new Map(
      (invoices.documents as unknown as { $id: string; invoice_number: string }[]).map((i) => [i.$id, i.invoice_number])
    );
    const items = (await listByField(SRI_COLLECTION, "sales_return_id", sr.$id)) as unknown as SalesReturnItem[];
    return {
      ...toPlain(sr),
      invoice_number: invoiceMap.get(sr.sales_invoice_id) ?? "—",
      customer_name: customerMap.get(sr.customer_id) ?? "—",
      total_returned: items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
      items: items.map((item) => {
        const p = productMap.get(item.product_id);
        return { ...toPlain(item), product_name: p?.name ?? "—", sku: p?.sku ?? "" };
      }),
    };
  } catch { return null; }
}

export type InvoiceForReturn = {
  $id: string; invoice_number: string; customer_id: string; customer_name: string;
  total_amount: number; status: string;
  items: { product_id: string; quantity: number; unit_price: number; line_total: number; sales_invoice_item_id: string }[];
};

export async function listInvoicesForReturn(): Promise<InvoiceForReturn[]> {
  const db = adminDatabases();
  const [siResult, customers] = await Promise.all([
    db.listDocuments(DATABASE_ID, SI_COLLECTION, [Query.equal("status", ["unpaid", "partial", "paid"])]),
    listCustomers({ includeInactive: true }),
  ]);
  const customerMap = new Map(customers.map((c) => [c.$id, c.name]));
  const results: InvoiceForReturn[] = [];
  for (const si of siResult.documents as unknown as { $id: string; invoice_number: string; customer_id: string; total_amount: number; status: string }[]) {
    const items = (await listByField(SII_COLLECTION, "sales_invoice_id", si.$id)) as unknown as {
      $id: string; product_id: string; quantity: number; unit_price: number; line_total: number;
    }[];
    results.push({
      $id: si.$id, invoice_number: si.invoice_number, customer_id: si.customer_id,
      customer_name: customerMap.get(si.customer_id) ?? "—", total_amount: si.total_amount, status: si.status,
      items: items.map((item) => ({
        product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price,
        line_total: item.line_total, sales_invoice_item_id: item.$id,
      })),
    });
  }
  return results;
}

async function nextReturnNumber(returnDate: string): Promise<string> {
  const prefix = `SR-${returnDate.replaceAll("-", "")}-`;
  const result = await adminDatabases().listDocuments(DATABASE_ID, SR_COLLECTION, [
    Query.startsWith("return_number", prefix),
  ]);
  return `${prefix}${String(result.total + 1).padStart(3, "0")}`;
}

export type SalesReturnInput = {
  sales_invoice_id: string; return_date: string; notes?: string;
  items: { product_id: string; quantity: number; unit_price: number; sales_invoice_item_id?: string }[];
};

export async function createSalesReturn(
  input: SalesReturnInput, userId: string
): Promise<Result<SalesReturnWithItems>> {
  if (!input.sales_invoice_id) return { ok: false, errors: { sales_invoice_id: "Wajib dipilih." }, code: "validation" };
  if (!input.return_date) return { ok: false, errors: { return_date: "Wajib diisi." }, code: "validation" };
  if (!input.items || input.items.length === 0) return { ok: false, errors: { items: "Minimal 1 item." }, code: "validation" };
  for (const item of input.items) {
    if (!item.product_id) return { ok: false, errors: { items: "Product wajib dipilih." }, code: "validation" };
    if (item.quantity <= 0) return { ok: false, errors: { items: "Qty harus > 0." }, code: "validation" };
    if (item.unit_price < 0) return { ok: false, errors: { items: "Harga tidak boleh negatif." }, code: "validation" };
  }
  try {
    const db = adminDatabases();
    const si = await db.getDocument(DATABASE_ID, SI_COLLECTION, input.sales_invoice_id) as unknown as { $id: string; customer_id: string };
    const now = nowIso();
    const returnNumber = await nextReturnNumber(input.return_date);
    const srDoc = await db.createDocument({
      databaseId: DATABASE_ID, collectionId: SR_COLLECTION, documentId: ID.unique(),
      data: {
        return_number: returnNumber, sales_invoice_id: input.sales_invoice_id,
        customer_id: si.customer_id, return_date: input.return_date, status: "draft",
        notes: input.notes?.trim() || null, created_by: userId, created_at: now,
      },
    });
    const createdItemIds: string[] = [];
    try {
      for (const item of input.items) {
        const itemDoc = await db.createDocument({
          databaseId: DATABASE_ID, collectionId: SRI_COLLECTION, documentId: ID.unique(),
          data: {
            sales_return_id: srDoc.$id, sales_invoice_item_id: item.sales_invoice_item_id || null,
            product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price,
          },
        });
        createdItemIds.push(itemDoc.$id);
      }
    } catch (itemError) {
      for (const itemId of createdItemIds) {
        try { await db.deleteDocument(DATABASE_ID, SRI_COLLECTION, itemId); } catch { /* best-effort */ }
      }
      throw itemError;
    }
    const [customers, products, invoices] = await Promise.all([
      listCustomers({ includeInactive: true }), listProducts({ includeInactive: true }),
      db.listDocuments(DATABASE_ID, SI_COLLECTION, [Query.limit(100)]),
    ]);
    const customerName = customers.find((c) => c.$id === si.customer_id)?.name ?? "—";
    const productMap = new Map(products.map((p) => [p.$id, { name: p.name, sku: p.sku }]));
    const invoiceMap = new Map(
      (invoices.documents as unknown as { $id: string; invoice_number: string }[]).map((i) => [i.$id, i.invoice_number])
    );
    const sr = srDoc as unknown as SalesReturn;
    return {
      ok: true, data: {
        ...toPlain(sr), invoice_number: invoiceMap.get(input.sales_invoice_id) ?? "—",
        customer_name: customerName,
        total_returned: input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
        items: input.items.map((item, i) => {
          const p = productMap.get(item.product_id);
          return toPlain({
            $id: createdItemIds[i] ?? "", sales_return_id: srDoc.$id,
            sales_invoice_item_id: item.sales_invoice_item_id || null,
            product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price,
            product_name: p?.name ?? "—", sku: p?.sku ?? "",
          });
        }) as unknown as SalesReturnWithItems["items"],
      },
    };
  } catch (error) {
    console.error("createSalesReturn failed:", error);
    return { ok: false, errors: { _form: "Gagal membuat retur." }, code: "create_failed" };
  }
}

export async function cancelSalesReturn(srId: string): Promise<Result<SalesReturn>> {
  try {
    const db = adminDatabases();
    const sr = await db.getDocument(DATABASE_ID, SR_COLLECTION, srId) as unknown as SalesReturn;
    if (sr.status !== "draft") return { ok: false, errors: {}, code: "not_draft" };
    const updated = await db.updateDocument({
      databaseId: DATABASE_ID, collectionId: SR_COLLECTION, documentId: srId,
      data: { status: "cancelled" },
    });
    return { ok: true, data: toPlain(updated as unknown as SalesReturn) };
  } catch (error) {
    console.error("cancelSalesReturn failed:", error);
    return { ok: false, errors: { _form: "Gagal membatalkan retur." }, code: "cancel_failed" };
  }
}

function getAdminClient() {
  return new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);
}

export async function postSalesReturn(
  srId: string, userId: string
): Promise<Result<{ movement_count: number; return_total: number }>> {
  const functions = new Functions(getAdminClient());
  let run;
  try {
    run = await functions.createExecution({
      functionId: "post-stock-opname",
      body: JSON.stringify({ type: "sales_return", sales_return_id: srId, created_by: userId }),
      async: false,
    });
  } catch (error) {
    console.error("postSalesReturn execution failed:", error);
    return { ok: false, errors: { _form: "Gagal menjalankan Function." }, code: "post_sr_failed" };
  }
  const statusCode = (run as unknown as { responseStatusCode?: number }).responseStatusCode;
  const body = (run as unknown as { responseBody?: string }).responseBody ?? "";
  let parsed: { ok?: boolean; errors?: Record<string, string>; movement_count?: number; return_total?: number } | null = null;
  try { parsed = JSON.parse(body); } catch { parsed = null; }
  if (statusCode === 200 && parsed?.ok) {
    return { ok: true, data: { movement_count: parsed.movement_count ?? 0, return_total: parsed.return_total ?? 0 } };
  }
  const errors = parsed?.errors ?? {};
  if ([400, 404, 409].includes(statusCode ?? 0)) return { ok: false, errors };
  return { ok: false, errors: { _form: errors._form ?? "Gagal memposting retur." }, code: "post_sr_failed" };
}
