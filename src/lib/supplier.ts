import "server-only";
import { ID, Permission, Query, Role } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";
import {
  normalizeSupplierCode,
  validateSupplierInput,
  type SupplierInput,
} from "./supplier-validation";

export const SUPPLIERS_DATABASE_ID = "erp";
export const SUPPLIERS_COLLECTION = "suppliers";

type AppwriteDoc = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: unknown;
};

export type Supplier = AppwriteDoc & {
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  payment_terms: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; code?: string };

const SUPPLIER_READ = ["admin", "purchasing", "finance", "warehouse"].map((label) =>
  Permission.read(Role.label(label))
);
const SUPPLIER_WRITE = ["admin", "purchasing"].map((label) =>
  Permission.write(Role.label(label))
);

const SUPPLIER_DOC_PERMISSIONS = [...SUPPLIER_READ, ...SUPPLIER_WRITE];

function nowIso(): string {
  return new Date().toISOString();
}

function toPlain<T extends Record<string, unknown>>(doc: T): T {
  return { ...doc };
}

function toAppwriteError(code: string): Result<never> {
  return { ok: false, errors: {}, code };
}

export async function listSuppliers(options?: { includeInactive?: boolean }): Promise<Supplier[]> {
  const queries: string[] = [];
  if (options?.includeInactive !== true) {
    queries.push(Query.equal("is_active", [true]));
  }

  const result = await adminDatabases().listDocuments(
    SUPPLIERS_DATABASE_ID,
    SUPPLIERS_COLLECTION,
    queries
  );
  const suppliers = result.documents as unknown as Supplier[];
  return suppliers.map(toPlain).sort((a, b) => a.code.localeCompare(b.code));
}

export async function findSupplierByCode(code: string): Promise<Supplier | null> {
  const result = await adminDatabases().listDocuments(
    SUPPLIERS_DATABASE_ID,
    SUPPLIERS_COLLECTION,
    [Query.equal("code", [normalizeSupplierCode(code)])]
  );
  return (result.documents[0] as unknown as Supplier) ?? null;
}

export async function createSupplier(
  input: SupplierInput,
  userId: string
): Promise<Result<Supplier>> {
  const validated = validateSupplierInput(input);
  if (!validated.ok) return validated;

  const now = nowIso();
  try {
    const doc = await adminDatabases().createDocument({
      databaseId: SUPPLIERS_DATABASE_ID,
      collectionId: SUPPLIERS_COLLECTION,
      documentId: ID.unique(),
      data: {
        code: normalizeSupplierCode(input.code),
        name: input.name.trim(),
        contact_person: input.contact_person?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        payment_terms: input.payment_terms?.trim() || null,
        is_active: true,
        created_by: userId,
        created_at: now,
      },
      permissions: SUPPLIER_DOC_PERMISSIONS,
    });
    return { ok: true, data: toPlain(doc as unknown as Supplier) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/unique|duplicate|already exists/i.test(message)) {
      return { ok: false, errors: { code: "Kode supplier sudah dipakai." }, code: "duplicate_field" };
    }
    console.error("createSupplier failed:", error);
    return toAppwriteError("create_supplier_failed");
  }
}

export async function updateSupplier(
  id: string,
  input: SupplierInput,
  userId: string
): Promise<Result<Supplier>> {
  const validated = validateSupplierInput(input);
  if (!validated.ok) return validated;

  const existing = await findSupplierByCode(input.code);
  if (existing && existing.$id !== id) {
    return { ok: false, errors: { code: "Kode supplier sudah dipakai." } };
  }

  try {
    const doc = await adminDatabases().updateDocument({
      databaseId: SUPPLIERS_DATABASE_ID,
      collectionId: SUPPLIERS_COLLECTION,
      documentId: id,
      data: {
        code: normalizeSupplierCode(input.code),
        name: input.name.trim(),
        contact_person: input.contact_person?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        payment_terms: input.payment_terms?.trim() || null,
        updated_by: userId,
        updated_at: nowIso(),
      },
    });
    return { ok: true, data: toPlain(doc as unknown as Supplier) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/unique|duplicate|already exists/i.test(message)) {
      return { ok: false, errors: { code: "Kode supplier sudah dipakai." }, code: "duplicate_field" };
    }
    console.error("updateSupplier failed:", error);
    return toAppwriteError("update_supplier_failed");
  }
}

export async function setSupplierActive(
  id: string,
  isActive: boolean,
  userId: string
): Promise<Result<Supplier>> {
  try {
    const doc = await adminDatabases().updateDocument({
      databaseId: SUPPLIERS_DATABASE_ID,
      collectionId: SUPPLIERS_COLLECTION,
      documentId: id,
      data: {
        is_active: isActive,
        updated_by: userId,
        updated_at: nowIso(),
      },
    });
    return { ok: true, data: toPlain(doc as unknown as Supplier) };
  } catch (error) {
    console.error("setSupplierActive failed:", error);
    return toAppwriteError("update_supplier_failed");
  }
}
