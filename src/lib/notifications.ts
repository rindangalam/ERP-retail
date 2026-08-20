import "server-only";
import { Query } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";
import { PRODUCTS_COLLECTION } from "./inventory";
import { PURCHASE_ORDERS_COLLECTION } from "./purchase-order";

const DATABASE_ID = "erp";
const SALES_INVOICES_COLLECTION = "sales_invoices";

export type NotificationKind = "po-approval" | "po-receipt" | "invoice-unpaid" | "stock-low";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  href: string;
  createdAt: string;
};

const MAX_PER_KIND = 3;

function limit(role: string, ...allowed: string[]): boolean {
  return allowed.includes(role);
}

export async function getNotifications(userId: string, role: string): Promise<AppNotification[]> {
  const db = adminDatabases();
  const notifications: AppNotification[] = [];
  const now = Date.now();

  if (limit(role, "admin", "purchasing")) {
    try {
      const res = await db.listDocuments(DATABASE_ID, PURCHASE_ORDERS_COLLECTION, [
        Query.equal("status", ["draft"]),
        Query.orderDesc("$createdAt"),
        Query.limit(MAX_PER_KIND),
      ]);
      for (const po of res.documents as unknown as Record<string, unknown>[]) {
        notifications.push({
          id: `po-draft-${po.$id}`,
          kind: "po-approval",
          title: `PO ${String(po.po_number ?? "-")} menunggu konfirmasi`,
          description: `Rp ${Number(po.total_amount ?? 0).toLocaleString("id-ID")} · perlu disetujui`,
          href: "/purchasing",
          createdAt: String(po.$updatedAt ?? po.created_at ?? new Date(now).toISOString()),
        });
      }
    } catch {}
  }

  if (limit(role, "admin", "warehouse")) {
    try {
      const res = await db.listDocuments(DATABASE_ID, PURCHASE_ORDERS_COLLECTION, [
        Query.equal("status", ["ordered"]),
        Query.orderDesc("$createdAt"),
        Query.limit(MAX_PER_KIND),
      ]);
      for (const po of res.documents as unknown as Record<string, unknown>[]) {
        notifications.push({
          id: `po-receipt-${po.$id}`,
          kind: "po-receipt",
          title: `Barang PO ${String(po.po_number ?? "-")} belum diterima`,
          description: "Buat goods receipt untuk menuntaskan PO",
          href: "/goods-receipts",
          createdAt: String(po.$updatedAt ?? new Date(now).toISOString()),
        });
      }
    } catch {}

    try {
      const res = await db.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION, [
        Query.limit(200),
      ]);
      const products = res.documents as unknown as {
        $id: string;
        name: string;
        current_stock: number;
        min_stock: number;
      }[];
      const low = products
        .filter((p) => Number(p.current_stock) < Number(p.min_stock))
        .sort((a, b) => Number(a.current_stock) - Number(b.current_stock))
        .slice(0, MAX_PER_KIND);
      for (const p of low) {
        notifications.push({
          id: `stock-low-${p.$id}`,
          kind: "stock-low",
          title: `${p.name} stok menipis`,
          description: `Tersisa ${Number(p.current_stock)} dari minimum ${Number(p.min_stock)}`,
          href: "/products",
          createdAt: new Date(now).toISOString(),
        });
      }
    } catch {}
  }

  if (limit(role, "admin", "sales", "finance")) {
    try {
      const res = await db.listDocuments(DATABASE_ID, SALES_INVOICES_COLLECTION, [
        Query.equal("status", ["unpaid"]),
        Query.orderDesc("$createdAt"),
        Query.limit(MAX_PER_KIND),
      ]);
      for (const si of res.documents as unknown as Record<string, unknown>[]) {
        notifications.push({
          id: `invoice-unpaid-${si.$id}`,
          kind: "invoice-unpaid",
          title: `Invoice ${String(si.invoice_number ?? "-")} belum dibayar`,
          description: `Rp ${Number(si.total_amount ?? 0).toLocaleString("id-ID")} · tagihan menunggu`,
          href: "/sales-invoices",
          createdAt: String(si.$updatedAt ?? new Date(now).toISOString()),
        });
      }
    } catch {}
  }

  notifications.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return notifications.slice(0, 8);
}