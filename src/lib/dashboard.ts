import "server-only";
import { Query } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";
import { getBalanceSheet } from "./reports";
import { listCashBankAccounts } from "./cash-bank";
import { listCategories, listProducts } from "./inventory";
import { listEmployees } from "./employee";

const DATABASE_ID = "erp";

export type DashboardSummary = {
  totalProducts: number;
  totalStockValue: number;
  totalEmployees: number;
  totalAssets: number;
  totalLiabilities: number;
  retainedEarnings: number;
  cashBalance: number;
  lowStockCount: number;
  lowStock: { id: string; name: string; current_stock: number; min_stock: number }[];
  recentEntries: { entry_number: string; entry_date: string; description: string; source_type: string }[];
  revenueSeries: { date: string; amount: number }[];
  categoryDistribution: { name: string; count: number }[];
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const today = new Date().toISOString().slice(0, 10);

  // Balance sheet (assets, liabilities, equity)
  const bs = await getBalanceSheet(today);

  // Cash balance from cash/bank accounts
  const cbaAccounts = await listCashBankAccounts();
  let cashBalance = 0;
  for (const acct of cbaAccounts) {
    if (!acct.is_active) continue;
    const db = adminDatabases();
    const txns = await db.listDocuments(DATABASE_ID, "cash_bank_transactions", [
      Query.equal("cash_bank_account_id", [acct.$id]),
      Query.limit(500),
    ]);
    let balance = acct.opening_balance || 0;
    for (const txn of txns.documents) {
      const t = txn as unknown as { transaction_type: string; amount: number };
      balance += t.transaction_type === "in" ? t.amount : -t.amount;
    }
    cashBalance += balance;
  }

  // Product count + stock value
  const products = await listProducts();
  const totalProducts = products.length;
  const totalStockValue = products.reduce((s, p) => s + (Number(p.current_stock || 0) * Number(p.cost_price || 0)), 0);
  const lowStockCount = products.filter((p) => Number(p.current_stock) < Number(p.min_stock)).length;
  const lowStock = products
    .filter((p) => Number(p.current_stock) < Number(p.min_stock))
    .sort((a, b) => Number(a.current_stock) - Number(b.current_stock))
    .slice(0, 5)
    .map((p) => ({
      id: p.$id,
      name: p.name,
      current_stock: Number(p.current_stock),
      min_stock: Number(p.min_stock),
    }));

  // Employee count
  const employees = await listEmployees();
  const totalEmployees = employees.length;

  // Recent journal entries (last 5)
  const db = adminDatabases();
  const entriesResult = await db.listDocuments(DATABASE_ID, "journal_entries", [
    Query.orderDesc("entry_date"),
    Query.limit(5),
  ]);
  const recentEntries = (entriesResult.documents as unknown as { entry_number: string; entry_date: string; description: string; source_type: string }[]).map((e) => ({
    entry_number: e.entry_number,
    entry_date: e.entry_date,
    description: e.description,
    source_type: e.source_type,
  }));

  // 30-day revenue trend from sales invoices
  const revenueSeries: { date: string; amount: number }[] = [];
  const dayMap = new Map<string, number>();
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();
  const invoices = await db.listDocuments(DATABASE_ID, "sales_invoices", [
    Query.greaterThanEqual("invoice_date", sinceIso.slice(0, 10)),
    Query.limit(500),
  ]);
  for (const inv of invoices.documents) {
    const i = inv as unknown as { invoice_date: string; total_amount: number; status: string };
    if (i.status === "cancelled") continue;
    const d = i.invoice_date.slice(0, 10);
    dayMap.set(d, (dayMap.get(d) ?? 0) + Number(i.total_amount ?? 0));
  }
  for (let k = 29; k >= 0; k--) {
    const d = new Date();
    d.setDate(d.getDate() - k);
    const key = d.toISOString().slice(0, 10);
    revenueSeries.push({ date: key, amount: dayMap.get(key) ?? 0 });
  }

  // Product distribution by category
  const categories = await listCategories();
  const categoryMap = new Map(categories.map((c) => [c.$id, c.name]));
  const countByCategory = new Map<string, number>();
  for (const p of products) {
    const key = p.category_id;
    if (!key) continue;
    countByCategory.set(key, (countByCategory.get(key) ?? 0) + 1);
  }
  const categoryDistribution = [...countByCategory.entries()]
    .map(([id, count]) => ({ name: categoryMap.get(id) ?? "Tanpa Kategori", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    totalProducts,
    totalStockValue,
    totalEmployees,
    totalAssets: bs.totalAssets,
    totalLiabilities: bs.totalLiabilities,
    retainedEarnings: bs.retainedEarnings,
    cashBalance,
    lowStockCount,
    lowStock,
    recentEntries,
    revenueSeries,
    categoryDistribution,
  };
}