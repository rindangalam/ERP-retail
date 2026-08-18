import "server-only";
import { ID, Query } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";

const DATABASE_ID = "erp";
const COA_COLLECTION = "chart_of_accounts";

type AppwriteDoc = { $id: string; $createdAt: string; $updatedAt: string; [key: string]: unknown };

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export type ChartOfAccount = AppwriteDoc & {
  code: string;
  name: string;
  account_type: AccountType;
  parent_account_id: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; code?: string };

function toPlain<T extends Record<string, unknown>>(doc: T): T { return { ...doc }; }

export async function listCOA(): Promise<ChartOfAccount[]> {
  const db = adminDatabases();
  const result = await db.listDocuments(DATABASE_ID, COA_COLLECTION, [
    Query.orderAsc("code"),
    Query.limit(100),
  ]);
  return result.documents.map((d) => ({ ...d })) as unknown as ChartOfAccount[];
}

export async function getCOA(id: string): Promise<ChartOfAccount | null> {
  try {
    const db = adminDatabases();
    const doc = await db.getDocument(DATABASE_ID, COA_COLLECTION, id);
    return toPlain(doc as unknown as ChartOfAccount);
  } catch { return null; }
}

export type COAInput = {
  code: string;
  name: string;
  account_type: AccountType;
  parent_account_id?: string;
};

export async function createCOA(input: COAInput, userId: string): Promise<Result<ChartOfAccount>> {
  if (!input.code?.trim()) return { ok: false, errors: { code: "Wajib diisi." }, code: "validation" };
  if (!input.name?.trim()) return { ok: false, errors: { name: "Wajib diisi." }, code: "validation" };
  if (!input.account_type) return { ok: false, errors: { account_type: "Wajib dipilih." }, code: "validation" };

  try {
    const db = adminDatabases();
    const existing = await db.listDocuments(DATABASE_ID, COA_COLLECTION, [
      Query.equal("code", [input.code.trim()]),
    ]);
    if (existing.total > 0) {
      return { ok: false, errors: { code: `Kode "${input.code}" sudah digunakan.` }, code: "duplicate" };
    }
    const now = new Date().toISOString();
    const doc = await db.createDocument({
      databaseId: DATABASE_ID, collectionId: COA_COLLECTION, documentId: ID.unique(),
      data: {
        code: input.code.trim(), name: input.name.trim(), account_type: input.account_type,
        parent_account_id: input.parent_account_id || null, is_active: true,
        created_by: userId, created_at: now,
      },
    });
    return { ok: true, data: toPlain(doc as unknown as ChartOfAccount) };
  } catch (error) {
    console.error("createCOA failed:", error);
    return { ok: false, errors: { _form: "Gagal membuat akun." }, code: "create_failed" };
  }
}

export async function updateCOA(id: string, input: Partial<COAInput>, userId: string): Promise<Result<ChartOfAccount>> {
  try {
    const db = adminDatabases();
    const data: Record<string, unknown> = { updated_by: userId, updated_at: new Date().toISOString() };
    if (input.code !== undefined) data.code = input.code.trim();
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.account_type !== undefined) data.account_type = input.account_type;
    if (input.parent_account_id !== undefined) data.parent_account_id = input.parent_account_id || null;
    const doc = await db.updateDocument({ databaseId: DATABASE_ID, collectionId: COA_COLLECTION, documentId: id, data });
    return { ok: true, data: toPlain(doc as unknown as ChartOfAccount) };
  } catch (error) {
    console.error("updateCOA failed:", error);
    return { ok: false, errors: { _form: "Gagal mengupdate akun." }, code: "update_failed" };
  }
}

export async function toggleCOAActive(id: string, userId: string): Promise<Result<ChartOfAccount>> {
  try {
    const db = adminDatabases();
    const doc = await db.getDocument(DATABASE_ID, COA_COLLECTION, id) as unknown as ChartOfAccount;
    const updated = await db.updateDocument({
      databaseId: DATABASE_ID, collectionId: COA_COLLECTION, documentId: id,
      data: { is_active: !doc.is_active, updated_by: userId, updated_at: new Date().toISOString() },
    });
    return { ok: true, data: toPlain(updated as unknown as ChartOfAccount) };
  } catch (error) {
    console.error("toggleCOAActive failed:", error);
    return { ok: false, errors: { _form: "Gagal mengubah status akun." }, code: "toggle_failed" };
  }
}
