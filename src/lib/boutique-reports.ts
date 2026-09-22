import "server-only";
import { Query } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";

const DATABASE_ID = "erp";
const SI_COLLECTION = "sales_invoices";
const SI_ITEMS_COLLECTION = "sales_invoice_items";
const PRODUCTS_COLLECTION = "products";
const VARIANTS_COLLECTION = "product_variants";

// ---------------------------------------------------------------------------
// Laporan Butik — sumber data INVOICE (operasional kasir), bukan jurnal.
// Beda dengan reports.ts (Neraca/Laba-Rugi/Arus Kas) yang agregat jurnal.
//
// STRATEGI BATCHING (anti N+1):
// Pola N+1 di getCashFlowStatement (1 query lines PER journal entry) dan di
// listSalesInvoices (1 query items PER invoice) sengaja dihindari di sini.
// Sebagai gantinya:
//  1. List invoice periode dalam 1 query ber-filter tanggal (paginasi offset).
//  2. Ambil SEMUA items sekaligus via Query.equal("sales_invoice_id", chunk)
//     dengan chunk 30 ID per round-trip (1 query melayani 30 invoice).
//  3. Scan koleksi products + product_variants masing-masing 1x (paginasi),
//     lalu join + agregat di memori.
// Total round-trip konstan terhadap jumlah invoice (±4-6 query), bukan O(N).
// Chunk 30 mengikuti batas batching yang dipakai reports.ts.
// ---------------------------------------------------------------------------

export type TodayOmzet = {
  total: number;
  count: number;
};

export type TodaySales = TodayOmzet & {
  itemsSold: number;
};

export type BestSellerRow = {
  product_variant_id: string | null;
  product_id: string;
  product_name: string;
  size: string;
  color: string;
  sku: string;
  qty: number;
  revenue: number;
};

export type LowStockVariant = {
  variant_id: string;
  product_name: string;
  size: string;
  color: string;
  sku: string;
  current_stock: number;
  min_stock: number;
};

export type MarginData = {
  from_date: string;
  to_date: string;
  revenue: number;
  cost: number;
  margin: number;
  itemsSold: number;
};

type InvoiceDoc = {
  $id: string;
  invoice_date: string;
  total_amount: number;
  status: string;
};

type ItemDoc = {
  $id: string;
  sales_invoice_id: string;
  product_id: string;
  product_variant_id: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type ProductDoc = {
  $id: string;
  name: string;
  sku: string;
  cost_price: number;
};

type VariantDoc = {
  $id: string;
  product_id: string;
  size: string;
  color: string;
  sku: string;
  current_stock: number;
  min_stock: number;
  is_active: boolean;
};

async function listAll(collection: string, queries: string[] = []): Promise<unknown[]> {
  const db = adminDatabases();
  const all: unknown[] = [];
  let offset = 0;
  for (;;) {
    const result = await db.listDocuments(DATABASE_ID, collection, [
      ...queries,
      Query.limit(100),
      Query.offset(offset),
    ]);
    all.push(...result.documents);
    if (result.documents.length < 100) break;
    offset += 100;
  }
  return all;
}

// Invoice periode (inklusif, format YYYY-MM-DD). Range query dipakai agar
// tetap benar bila invoice_date tersimpan sebagai datetime maupun date-only.
// Invoice cancelled selalu di-SKIP (bukan penjualan sah).
async function getInvoicesInPeriod(from: string, to: string): Promise<InvoiceDoc[]> {
  const docs = await listAll(SI_COLLECTION, [
    Query.greaterThanEqual("invoice_date", from),
    Query.lessThanEqual("invoice_date", to),
  ]);
  return (docs as unknown as InvoiceDoc[]).filter((inv) => inv.status !== "cancelled");
}

// Batch: 1 query items melayani s.d. 30 invoice (hindari 1 query per invoice).
async function getItemsForInvoices(invoiceIds: string[]): Promise<ItemDoc[]> {
  if (invoiceIds.length === 0) return [];
  const all: ItemDoc[] = [];
  for (let i = 0; i < invoiceIds.length; i += 30) {
    const chunk = invoiceIds.slice(i, i + 30);
    const docs = await listAll(SI_ITEMS_COLLECTION, [
      Query.equal("sales_invoice_id", chunk),
    ]);
    all.push(...(docs as unknown as ItemDoc[]));
  }
  return all;
}

async function getProductMap(): Promise<Map<string, ProductDoc>> {
  const docs = await listAll(PRODUCTS_COLLECTION);
  return new Map((docs as unknown as ProductDoc[]).map((p) => [p.$id, p]));
}

async function getVariantMap(): Promise<Map<string, VariantDoc>> {
  const docs = await listAll(VARIANTS_COLLECTION);
  return new Map((docs as unknown as VariantDoc[]).map((v) => [v.$id, v]));
}

export async function getTodaySales(tgl: string): Promise<TodaySales> {
  const invoices = await getInvoicesInPeriod(tgl, tgl);
  const validIds = new Set(invoices.map((inv) => inv.$id));
  const items = await getItemsForInvoices([...validIds]);
  const itemsSold = items
    .filter((it) => validIds.has(it.sales_invoice_id))
    .reduce((s, it) => s + Number(it.quantity || 0), 0);
  return {
    total: invoices.reduce((s, inv) => s + Number(inv.total_amount || 0), 0),
    count: invoices.length,
    itemsSold,
  };
}

export async function getTodayOmzet(tgl: string): Promise<TodayOmzet> {
  const sales = await getTodaySales(tgl);
  return { total: sales.total, count: sales.count };
}

export async function getBestSellers(
  from: string,
  to: string,
  limit = 10,
): Promise<BestSellerRow[]> {
  const invoices = await getInvoicesInPeriod(from, to);
  if (invoices.length === 0) return [];
  const validIds = new Set(invoices.map((inv) => inv.$id));

  const [items, productMap, variantMap] = await Promise.all([
    getItemsForInvoices([...validIds]),
    getProductMap(),
    getVariantMap(),
  ]);

  // Agregat per varian; item tanpa varian dikelompokkan per product_id.
  const agg = new Map<string, BestSellerRow>();
  for (const it of items) {
    if (!validIds.has(it.sales_invoice_id)) continue;
    const variantId =
      (it as unknown as { product_variant_id?: string | null }).product_variant_id ?? null;
    const key = variantId ? `v:${variantId}` : `p:${it.product_id}`;
    const product = productMap.get(it.product_id);
    const variant = variantId ? variantMap.get(variantId) : undefined;
    const existing = agg.get(key);
    const qty = Number(it.quantity || 0);
    const revenue = Number(it.line_total ?? Number(it.unit_price || 0) * qty);
    if (existing) {
      existing.qty += qty;
      existing.revenue += revenue;
    } else {
      agg.set(key, {
        product_variant_id: variantId,
        product_id: it.product_id,
        product_name: product?.name ?? "—",
        size: variant?.size ?? "",
        color: variant?.color ?? "",
        sku: variant?.sku ?? product?.sku ?? "",
        qty,
        revenue,
      });
    }
  }

  return [...agg.values()].sort((a, b) => b.qty - a.qty).slice(0, limit);
}

export async function getLowStockVariants(): Promise<LowStockVariant[]> {
  const [variantDocs, productMap] = await Promise.all([
    listAll(VARIANTS_COLLECTION),
    getProductMap(),
  ]);
  const variants = variantDocs as unknown as VariantDoc[];
  return variants
    .filter((v) => v.is_active && Number(v.current_stock) < Number(v.min_stock))
    .map((v) => ({
      variant_id: v.$id,
      product_name: productMap.get(v.product_id)?.name ?? "—",
      size: v.size ?? "",
      color: v.color ?? "",
      sku: v.sku ?? "",
      current_stock: Number(v.current_stock),
      min_stock: Number(v.min_stock),
    }))
    .sort((a, b) => a.current_stock - b.current_stock);
}

export async function getMargin(from: string, to: string): Promise<MarginData> {
  const invoices = await getInvoicesInPeriod(from, to);
  if (invoices.length === 0) {
    return { from_date: from, to_date: to, revenue: 0, cost: 0, margin: 0, itemsSold: 0 };
  }
  const validIds = new Set(invoices.map((inv) => inv.$id));
  const [items, productMap] = await Promise.all([
    getItemsForInvoices([...validIds]),
    getProductMap(),
  ]);

  // Harga jual dari item.unit_price/line_total; cost dari produk (varian
  // tidak menyimpan cost — hanya sell_price opsional).
  let revenue = 0;
  let cost = 0;
  let itemsSold = 0;
  for (const it of items) {
    if (!validIds.has(it.sales_invoice_id)) continue;
    const qty = Number(it.quantity || 0);
    revenue += Number(it.line_total ?? Number(it.unit_price || 0) * qty);
    cost += Number(productMap.get(it.product_id)?.cost_price || 0) * qty;
    itemsSold += qty;
  }
  return { from_date: from, to_date: to, revenue, cost, margin: revenue - cost, itemsSold };
}
