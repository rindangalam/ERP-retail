import "server-only";
import { ID, Query } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";

const DATABASE_ID = "erp";
const CBA_COLLECTION = "cash_bank_accounts";
const CBT_COLLECTION = "cash_bank_transactions";

type AppwriteDoc = { $id: string; $createdAt: string; $updatedAt: string; [key: string]: unknown };

export type CashBankAccount = AppwriteDoc & {
  name: string;
  account_type: "cash" | "bank";
  bank_name: string | null;
  account_number: string | null;
  opening_balance: number;
  is_active: boolean;
  coa_account_id: string | null;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
};

export type CashBankTransaction = AppwriteDoc & {
  cash_bank_account_id: string;
  transaction_date: string;
  transaction_type: "in" | "out";
  amount: number;
  source_type: string | null;
  source_id: string | null;
  description: string;
  created_by: string;
  created_at: string;
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; code?: string };

function toPlain<T extends Record<string, unknown>>(doc: T): T { return { ...doc }; }

export async function listCashBankAccounts(): Promise<CashBankAccount[]> {
  const db = adminDatabases();
  const result = await db.listDocuments(DATABASE_ID, CBA_COLLECTION, [
    Query.orderAsc("name"),
    Query.limit(100),
  ]);
  return result.documents.map((d) => ({ ...d })) as unknown as CashBankAccount[];
}

export async function getCashBankAccount(id: string): Promise<CashBankAccount | null> {
  try {
    const db = adminDatabases();
    const doc = await db.getDocument(DATABASE_ID, CBA_COLLECTION, id);
    return toPlain(doc as unknown as CashBankAccount);
  } catch { return null; }
}

export async function listTransactions(accountId: string): Promise<CashBankTransaction[]> {
  const db = adminDatabases();
  const result = await db.listDocuments(DATABASE_ID, CBT_COLLECTION, [
    Query.equal("cash_bank_account_id", [accountId]),
    Query.orderDesc("transaction_date"),
    Query.limit(100),
  ]);
  return result.documents.map((d) => ({ ...d })) as unknown as CashBankTransaction[];
}

export async function getBalance(accountId: string): Promise<number> {
  const account = await getCashBankAccount(accountId);
  if (!account) return 0;
  const txns = await listTransactions(accountId);
  let balance = account.opening_balance || 0;
  for (const txn of txns) {
    balance += txn.transaction_type === "in" ? txn.amount : -txn.amount;
  }
  return balance;
}

export type CBAInput = {
  name: string;
  account_type: "cash" | "bank";
  bank_name?: string;
  account_number?: string;
  opening_balance?: number;
  coa_account_id?: string;
};

export async function createCashBankAccount(input: CBAInput, userId: string): Promise<Result<CashBankAccount>> {
  if (!input.name?.trim()) return { ok: false, errors: { name: "Wajib diisi." }, code: "validation" };

  try {
    const db = adminDatabases();
    const now = new Date().toISOString();
    const doc = await db.createDocument({
      databaseId: DATABASE_ID, collectionId: CBA_COLLECTION, documentId: ID.unique(),
      data: {
        name: input.name.trim(), account_type: input.account_type,
        bank_name: input.bank_name || null, account_number: input.account_number || null,
        opening_balance: input.opening_balance || 0, is_active: true,
        coa_account_id: input.coa_account_id || null,
        created_by: userId, created_at: now,
      },
    });
    return { ok: true, data: toPlain(doc as unknown as CashBankAccount) };
  } catch (error) {
    console.error("createCashBankAccount failed:", error);
    return { ok: false, errors: { _form: "Gagal membuat akun kas/bank." }, code: "create_failed" };
  }
}

export async function updateCashBankAccount(id: string, input: Partial<CBAInput>, userId: string): Promise<Result<CashBankAccount>> {
  try {
    const db = adminDatabases();
    const data: Record<string, unknown> = { updated_by: userId, updated_at: new Date().toISOString() };
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.account_type !== undefined) data.account_type = input.account_type;
    if (input.bank_name !== undefined) data.bank_name = input.bank_name || null;
    if (input.account_number !== undefined) data.account_number = input.account_number || null;
    if (input.opening_balance !== undefined) data.opening_balance = input.opening_balance;
    if (input.coa_account_id !== undefined) data.coa_account_id = input.coa_account_id || null;
    const doc = await db.updateDocument({ databaseId: DATABASE_ID, collectionId: CBA_COLLECTION, documentId: id, data });
    return { ok: true, data: toPlain(doc as unknown as CashBankAccount) };
  } catch (error) {
    console.error("updateCashBankAccount failed:", error);
    return { ok: false, errors: { _form: "Gagal mengupdate akun kas/bank." }, code: "update_failed" };
  }
}

export type CBTInput = {
  cash_bank_account_id: string;
  transaction_date: string;
  transaction_type: "in" | "out";
  amount: number;
  description: string;
};

export async function createTransaction(input: CBTInput, userId: string): Promise<Result<CashBankTransaction>> {
  if (!input.description?.trim()) return { ok: false, errors: { description: "Wajib diisi." }, code: "validation" };
  if (!input.amount || input.amount <= 0) return { ok: false, errors: { amount: "Harus lebih dari 0." }, code: "validation" };
  if (!input.transaction_date) return { ok: false, errors: { transaction_date: "Wajib diisi." }, code: "validation" };

  try {
    const db = adminDatabases();
    const now = new Date().toISOString();
    const doc = await db.createDocument({
      databaseId: DATABASE_ID, collectionId: CBT_COLLECTION, documentId: ID.unique(),
      data: {
        cash_bank_account_id: input.cash_bank_account_id,
        transaction_date: input.transaction_date,
        transaction_type: input.transaction_type,
        amount: input.amount,
        source_type: null, source_id: null,
        description: input.description.trim(),
        created_by: userId, created_at: now,
      },
    });
    return { ok: true, data: toPlain(doc as unknown as CashBankTransaction) };
  } catch (error) {
    console.error("createTransaction failed:", error);
    return { ok: false, errors: { _form: "Gagal mencatat transaksi." }, code: "create_failed" };
  }
}
