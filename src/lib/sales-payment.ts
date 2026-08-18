import "server-only";
import { ID, Query } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";
import type { SalesInvoiceStatus } from "./sales-invoice";

const DATABASE_ID = "erp";
const SP_COLLECTION = "sales_payments";
const SI_COLLECTION = "sales_invoices";

type AppwriteDoc = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: unknown;
};

export type PaymentMethod = "cash" | "bank_transfer" | "other";

export type SalesPayment = AppwriteDoc & {
  invoice_id: string;
  customer_id: string;
  payment_date: string;
  amount: number;
  method: PaymentMethod;
  cash_bank_account_id: string | null;
  reference: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};

export type PaymentInput = {
  invoice_id: string;
  payment_date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
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

export async function listPaymentsByInvoice(invoiceId: string): Promise<SalesPayment[]> {
  const db = adminDatabases();
  const result = await db.listDocuments(DATABASE_ID, SP_COLLECTION, [
    Query.equal("invoice_id", [invoiceId]),
    Query.orderAsc("payment_date"),
  ]);
  return result.documents as unknown as SalesPayment[];
}

export async function getPaymentSummary(invoiceId: string): Promise<{ total_paid: number; count: number }> {
  const payments = await listPaymentsByInvoice(invoiceId);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  return { total_paid: totalPaid, count: payments.length };
}

function calcInvoiceStatus(totalAmount: number, totalPaid: number): SalesInvoiceStatus {
  if (totalPaid <= 0) return "unpaid";
  if (totalPaid >= totalAmount) return "paid";
  return "partial";
}

export async function createSalesPayment(
  input: PaymentInput,
  userId: string
): Promise<Result<SalesPayment>> {
  if (!input.invoice_id) return { ok: false, errors: { invoice_id: "Wajib diisi." }, code: "validation" };
  if (!input.payment_date) return { ok: false, errors: { payment_date: "Wajib diisi." }, code: "validation" };
  if (!input.amount || input.amount <= 0) return { ok: false, errors: { amount: "Jumlah pembayaran harus lebih dari 0." }, code: "validation" };
  if (!input.method) return { ok: false, errors: { method: "Metode pembayaran wajib diisi." }, code: "validation" };

  try {
    const db = adminDatabases();

    const si = await db.getDocument(DATABASE_ID, SI_COLLECTION, input.invoice_id) as unknown as {
      $id: string;
      status: string;
      total_amount: number;
      customer_id: string;
    };

    if (si.status === "cancelled") {
      return { ok: false, errors: { _form: "Invoice yang dibatalkan tidak bisa dibayar." }, code: "cancelled" };
    }

    const summary = await getPaymentSummary(input.invoice_id);
    const remaining = si.total_amount - summary.total_paid;
    if (input.amount > remaining) {
      return { ok: false, errors: { amount: `Melebihi sisa tagihan (sisa: Rp ${remaining.toLocaleString("id-ID")}).` }, code: "overpay" };
    }

    const now = nowIso();
    const doc = await db.createDocument({
      databaseId: DATABASE_ID,
      collectionId: SP_COLLECTION,
      documentId: ID.unique(),
      data: {
        invoice_id: input.invoice_id,
        customer_id: si.customer_id,
        payment_date: input.payment_date,
        amount: input.amount,
        method: input.method,
        cash_bank_account_id: null,
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
        created_by: userId,
        created_at: now,
      },
    });

    const newTotalPaid = summary.total_paid + input.amount;
    const newStatus = calcInvoiceStatus(si.total_amount, newTotalPaid);
    await db.updateDocument({
      databaseId: DATABASE_ID,
      collectionId: SI_COLLECTION,
      documentId: input.invoice_id,
      data: { status: newStatus },
    });

    return { ok: true, data: toPlain(doc as unknown as SalesPayment) };
  } catch (error) {
    console.error("createSalesPayment failed:", error);
    return { ok: false, errors: { _form: "Gagal mencatat pembayaran." }, code: "create_failed" };
  }
}
