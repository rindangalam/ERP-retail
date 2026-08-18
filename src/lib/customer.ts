import "server-only";
import { ID, Permission, Query, Role } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";
import {
  normalizeCustomerCode,
  validateCustomerInput,
  type CustomerInput,
} from "./customer-validation";

export const CUSTOMERS_DATABASE_ID = "erp";
export const CUSTOMERS_COLLECTION = "customers";

type AppwriteDoc = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: unknown;
};

export type Customer = AppwriteDoc & {
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  credit_limit: number | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; code?: string };

const CUSTOMER_READ = ["admin", "sales", "finance"].map((label) =>
  Permission.read(Role.label(label))
);
const CUSTOMER_WRITE = ["admin", "sales"].map((label) =>
  Permission.write(Role.label(label))
);

const CUSTOMER_DOC_PERMISSIONS = [...CUSTOMER_READ, ...CUSTOMER_WRITE];

function nowIso(): string {
  return new Date().toISOString();
}

function toPlain<T extends Record<string, unknown>>(doc: T): T {
  return { ...doc };
}

function toAppwriteError(code: string): Result<never> {
  return { ok: false, errors: {}, code };
}

export async function listCustomers(options?: { includeInactive?: boolean }): Promise<Customer[]> {
  const queries: string[] = [];
  if (options?.includeInactive !== true) {
    queries.push(Query.equal("is_active", [true]));
  }

  const result = await adminDatabases().listDocuments(
    CUSTOMERS_DATABASE_ID,
    CUSTOMERS_COLLECTION,
    queries
  );
  const customers = result.documents as unknown as Customer[];
  return customers.map(toPlain).sort((a, b) => a.code.localeCompare(b.code));
}

export async function findCustomerByCode(code: string): Promise<Customer | null> {
  const result = await adminDatabases().listDocuments(
    CUSTOMERS_DATABASE_ID,
    CUSTOMERS_COLLECTION,
    [Query.equal("code", [normalizeCustomerCode(code)])]
  );
  return (result.documents[0] as unknown as Customer) ?? null;
}

export async function createCustomer(
  input: CustomerInput,
  userId: string
): Promise<Result<Customer>> {
  const validated = validateCustomerInput(input);
  if (!validated.ok) return validated;

  const now = nowIso();
  try {
    const doc = await adminDatabases().createDocument({
      databaseId: CUSTOMERS_DATABASE_ID,
      collectionId: CUSTOMERS_COLLECTION,
      documentId: ID.unique(),
      data: {
        code: normalizeCustomerCode(input.code),
        name: input.name.trim(),
        contact_person: input.contact_person?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        credit_limit: input.credit_limit ?? null,
        is_active: true,
        created_by: userId,
        created_at: now,
      },
      permissions: CUSTOMER_DOC_PERMISSIONS,
    });
    return { ok: true, data: toPlain(doc as unknown as Customer) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/unique|duplicate|already exists/i.test(message)) {
      return { ok: false, errors: { code: "Kode customer sudah dipakai." }, code: "duplicate_field" };
    }
    console.error("createCustomer failed:", error);
    return toAppwriteError("create_customer_failed");
  }
}

export async function updateCustomer(
  id: string,
  input: CustomerInput,
  userId: string
): Promise<Result<Customer>> {
  const validated = validateCustomerInput(input);
  if (!validated.ok) return validated;

  const existing = await findCustomerByCode(input.code);
  if (existing && existing.$id !== id) {
    return { ok: false, errors: { code: "Kode customer sudah dipakai." } };
  }

  try {
    const doc = await adminDatabases().updateDocument({
      databaseId: CUSTOMERS_DATABASE_ID,
      collectionId: CUSTOMERS_COLLECTION,
      documentId: id,
      data: {
        code: normalizeCustomerCode(input.code),
        name: input.name.trim(),
        contact_person: input.contact_person?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        credit_limit: input.credit_limit ?? null,
        updated_by: userId,
        updated_at: nowIso(),
      },
    });
    return { ok: true, data: toPlain(doc as unknown as Customer) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/unique|duplicate|already exists/i.test(message)) {
      return { ok: false, errors: { code: "Kode customer sudah dipakai." }, code: "duplicate_field" };
    }
    console.error("updateCustomer failed:", error);
    return toAppwriteError("update_customer_failed");
  }
}

export async function setCustomerActive(
  id: string,
  isActive: boolean,
  userId: string
): Promise<Result<Customer>> {
  try {
    const doc = await adminDatabases().updateDocument({
      databaseId: CUSTOMERS_DATABASE_ID,
      collectionId: CUSTOMERS_COLLECTION,
      documentId: id,
      data: {
        is_active: isActive,
        updated_by: userId,
        updated_at: nowIso(),
      },
    });
    return { ok: true, data: toPlain(doc as unknown as Customer) };
  } catch (error) {
    console.error("setCustomerActive failed:", error);
    return toAppwriteError("update_customer_failed");
  }
}
