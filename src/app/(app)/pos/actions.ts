"use server";

import { requireRole } from "@/lib/dal";
import { listCustomers } from "@/lib/customer";
import {
  cancelInternalCashSO,
  createInternalCashSO,
} from "@/lib/sales-order";
import {
  cancelSalesInvoice,
  createSalesInvoice,
  postSalesInvoice,
} from "@/lib/sales-invoice";
import { createSalesPayment } from "@/lib/sales-payment";

export type QuickSaleItemInput = {
  product_id: string;
  product_variant_id?: string | null;
  quantity: number;
  unit_price: number;
};

export type QuickSaleInput = {
  items: QuickSaleItemInput[];
  payment_method: "cash" | "bank_transfer";
  cash_received: number;
  customer_id?: string;
  discount?: number;
};

export type QuickSaleResult =
  | { ok: true; invoice_number: string; change: number }
  | {
      ok: false;
      errors: Record<string, string>;
      invoice_number?: string;
      invoice_id?: string;
    };

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toIdr(value: number): string {
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

export async function quickSaleAction(input: QuickSaleInput): Promise<QuickSaleResult> {
  const session = await requireRole(["admin", "sales"]);
  const userId = session.userId;

  if (!input.items || input.items.length === 0) {
    return { ok: false, errors: { items: "Keranjang masih kosong." } };
  }
  for (const item of input.items) {
    if (!item.product_id) return { ok: false, errors: { items: "Ada item tanpa produk." } };
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return { ok: false, errors: { items: "Quantity harus lebih dari 0." } };
    }
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
      return { ok: false, errors: { items: "Harga satuan harus >= 0." } };
    }
  }

  const discount = input.discount ?? 0;
  if (!Number.isFinite(discount) || discount < 0) {
    return { ok: false, errors: { discount: "Diskon harus >= 0." } };
  }

  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const total = subtotal - discount;
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, errors: { discount: "Diskon melebihi subtotal." } };
  }

  if (input.payment_method !== "cash" && input.payment_method !== "bank_transfer") {
    return { ok: false, errors: { payment_method: "Metode pembayaran tidak valid." } };
  }
  if (!Number.isFinite(input.cash_received) || input.cash_received < 0) {
    return { ok: false, errors: { cash_received: "Nominal pembayaran tidak valid." } };
  }
  if (input.payment_method === "cash" && input.cash_received < total) {
    return {
      ok: false,
      errors: { cash_received: `Tunai kurang ${toIdr(total - input.cash_received)}.` },
    };
  }
  if (input.payment_method === "bank_transfer" && input.cash_received !== total) {
    return { ok: false, errors: { cash_received: "Nominal transfer harus pas dengan total." } };
  }

  let customerId = input.customer_id?.trim() || "";
  if (!customerId) {
    const customers = await listCustomers();
    const umum = customers.find(
      (c) => c.name.trim().toLowerCase() === "umum" || c.code.trim().toLowerCase() === "umum",
    );
    if (!umum) {
      return {
        ok: false,
        errors: { customer_id: "Pilih customer — customer UMUM belum tersedia." },
      };
    }
    customerId = umum.$id;
  }

  const today = todayDate();

  const soResult = await createInternalCashSO(
    customerId,
    userId,
    input.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
    today,
  );
  if (!soResult.ok) {
    return { ok: false, errors: soResult.errors };
  }
  const soId = soResult.data.$id;

  const invoiceResult = await createSalesInvoice(
    {
      sales_order_id: soId,
      customer_id: customerId,
      invoice_date: today,
      due_date: today,
      discount,
      items: input.items.map((item) => ({
        product_id: item.product_id,
        product_variant_id: item.product_variant_id ?? null,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    },
    userId,
  );
  if (!invoiceResult.ok) {
    await cancelInternalCashSO(soId, userId);
    return { ok: false, errors: invoiceResult.errors };
  }

  const invoiceId = invoiceResult.data.$id;
  const invoiceNumber = invoiceResult.data.invoice_number;
  const invoiceTotal = invoiceResult.data.total_amount;

  const postResult = await postSalesInvoice(invoiceId, userId);
  if (!postResult.ok) {
    await cancelSalesInvoice(invoiceId);
    await cancelInternalCashSO(soId, userId);
    return { ok: false, errors: postResult.errors };
  }

  const paymentResult = await createSalesPayment(
    {
      invoice_id: invoiceId,
      payment_date: today,
      amount: invoiceTotal,
      method: input.payment_method,
      reference: input.payment_method === "bank_transfer" ? "POS" : undefined,
      notes: "POS kasir tunai",
    },
    userId,
  );
  if (!paymentResult.ok) {
    // Invoice sudah posted-unpaid: kembalikan identitasnya agar kasir bisa
    // melunasi dari halaman invoice alih-alih retry buta (risiko double).
    return {
      ok: false,
      errors: paymentResult.errors,
      invoice_number: invoiceNumber,
      invoice_id: invoiceId,
    };
  }

  return { ok: true, invoice_number: invoiceNumber, change: input.cash_received - invoiceTotal };
}
