import "server-only";
import { ID, Permission, Query, Role } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";
import {
  normalizeSku,
  validateCategoryInput,
  validateProductInput,
  type CategoryInput,
  type ProductInput,
} from "./inventory-validation";

export const INVENTORY_DATABASE_ID = "erp";
export const PRODUCT_CATEGORIES_COLLECTION = "product_categories";
export const PRODUCTS_COLLECTION = "products";

type AppwriteDoc = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: unknown;
};

export type Product = AppwriteDoc & {
  sku: string;
  name: string;
  barcode: string | null;
  category_id: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  min_stock: number;
  current_stock: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
};

export type ProductCategory = AppwriteDoc & {
  name: string;
  description: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; code?: string };

const PRODUCT_DOC_READ = ["admin", "warehouse", "purchasing", "sales", "finance"].map((label) =>
  Permission.read(Role.label(label))
);
const PRODUCT_DOC_WRITE = ["admin", "warehouse"].map((label) =>
  Permission.write(Role.label(label))
);

const PRODUCT_DOC_PERMISSIONS = [...PRODUCT_DOC_READ, ...PRODUCT_DOC_WRITE];

function nowIso(): string {
  return new Date().toISOString();
}

// Appwrite mengembalikan class instance (Models.Document) yang tidak bisa
// diserialisasi ke Client Component. Spread ke plain object dulu.
function toPlain<T extends Record<string, unknown>>(doc: T): T {
  return { ...doc };
}

function toAppwriteError(code: string): Result<never> {
  return {
    ok: false,
    errors: {},
    code,
  };
}

export async function listCategories(): Promise<ProductCategory[]> {
  const result = await adminDatabases().listDocuments(
    INVENTORY_DATABASE_ID,
    PRODUCT_CATEGORIES_COLLECTION
  );
  const categories = result.documents as unknown as ProductCategory[];
  return categories.map(toPlain).sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function listProducts(options?: {
  categoryId?: string;
  includeInactive?: boolean;
  search?: string;
}): Promise<Product[]> {
  const queries: string[] = [];
  if (options?.categoryId) {
    queries.push(Query.equal("category_id", [options.categoryId]));
  }
  if (options?.includeInactive !== true) {
    queries.push(Query.equal("is_active", [true]));
  }

  const result = await adminDatabases().listDocuments(
    INVENTORY_DATABASE_ID,
    PRODUCTS_COLLECTION,
    queries
  );
  const products = result.documents as unknown as Product[];
  const plain = products.map(toPlain);

  const search = options?.search?.trim().toLowerCase();
  if (search) {
    return plain
      .filter(
        (p) => p.sku.toLowerCase().includes(search) || p.name.toLowerCase().includes(search)
      )
      .sort((a, b) => a.sku.localeCompare(b.sku));
  }

  return plain.sort((a, b) => a.sku.localeCompare(b.sku));
}

export async function findProductBySku(sku: string): Promise<Product | null> {
  const result = await adminDatabases().listDocuments(
    INVENTORY_DATABASE_ID,
    PRODUCTS_COLLECTION,
    [Query.equal("sku", [normalizeSku(sku)])]
  );
  return (result.documents[0] as unknown as Product) ?? null;
}

export async function listLowStockProducts(): Promise<Product[]> {
  const products = await listProducts({ includeInactive: false });
  return products
    .filter((p) => Number(p.current_stock) < Number(p.min_stock))
    .sort((a, b) => Number(a.current_stock) - Number(b.current_stock));
}

export async function findProductById(id: string): Promise<Product | null> {
  try {
    const doc = await adminDatabases().getDocument(INVENTORY_DATABASE_ID, PRODUCTS_COLLECTION, id);
    return toPlain(doc as unknown as Product);
  } catch {
    return null;
  }
}

async function findProductByBarcode(barcode: string): Promise<Product | null> {
  if (!barcode?.trim()) return null;
  const result = await adminDatabases().listDocuments(
    INVENTORY_DATABASE_ID,
    PRODUCTS_COLLECTION,
    [Query.equal("barcode", [barcode.trim()])]
  );
  return (result.documents[0] as unknown as Product) ?? null;
}

export async function createCategory(input: CategoryInput, userId: string): Promise<Result<ProductCategory>> {
  const validated = validateCategoryInput(input);
  if (!validated.ok) return validated;

  const now = nowIso();
  try {
    const doc = await adminDatabases().createDocument({
      databaseId: INVENTORY_DATABASE_ID,
      collectionId: PRODUCT_CATEGORIES_COLLECTION,
      documentId: ID.unique(),
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        is_active: true,
        created_by: userId,
        created_at: now,
      },
      permissions: PRODUCT_DOC_PERMISSIONS,
    });
    return { ok: true, data: doc as unknown as ProductCategory };
  } catch (error) {
    console.error("createCategory failed:", error);
    return toAppwriteError("create_category_failed");
  }
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
  userId: string
): Promise<Result<ProductCategory>> {
  const validated = validateCategoryInput(input);
  if (!validated.ok) return validated;

  try {
    const doc = await adminDatabases().updateDocument({
      databaseId: INVENTORY_DATABASE_ID,
      collectionId: PRODUCT_CATEGORIES_COLLECTION,
      documentId: id,
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        updated_by: userId,
        updated_at: nowIso(),
      },
    });
    return { ok: true, data: doc as unknown as ProductCategory };
  } catch (error) {
    console.error("updateCategory failed:", error);
    return toAppwriteError("update_category_failed");
  }
}

export async function setCategoryActive(
  id: string,
  isActive: boolean,
  userId: string
): Promise<Result<ProductCategory>> {
  try {
    const doc = await adminDatabases().updateDocument({
      databaseId: INVENTORY_DATABASE_ID,
      collectionId: PRODUCT_CATEGORIES_COLLECTION,
      documentId: id,
      data: {
        is_active: isActive,
        updated_by: userId,
        updated_at: nowIso(),
      },
    });
    return { ok: true, data: doc as unknown as ProductCategory };
  } catch (error) {
    console.error("setCategoryActive failed:", error);
    return toAppwriteError("update_category_failed");
  }
}

export function isDuplicateError(error: unknown): { field: "sku" | "barcode" } | null {
  const message = error instanceof Error ? error.message : String(error);
  if (!/unique|duplicate|already exists/i.test(message)) return null;
  return /barcode/i.test(message) ? { field: "barcode" } : { field: "sku" };
}

async function assertUniqueFields(
  input: ProductInput,
  excludeId?: string
): Promise<Record<string, string> | null> {
  const sku = normalizeSku(input.sku);

  const existingSku = await findProductBySku(sku);
  if (existingSku && existingSku.$id !== excludeId) {
    return { sku: "SKU sudah dipakai produk lain." };
  }

  if (input.barcode?.trim()) {
    const existingBarcode = await findProductByBarcode(input.barcode);
    if (existingBarcode && existingBarcode.$id !== excludeId) {
      return { barcode: "Barcode sudah dipakai produk lain." };
    }
  }

  return null;
}

export async function createProduct(
  input: ProductInput,
  userId: string
): Promise<Result<Product>> {
  const validated = validateProductInput(input);
  if (!validated.ok) return validated;

  const uniqueError = await assertUniqueFields(input);
  if (uniqueError) return { ok: false, errors: uniqueError };

  const now = nowIso();
  try {
    const doc = await adminDatabases().createDocument({
      databaseId: INVENTORY_DATABASE_ID,
      collectionId: PRODUCTS_COLLECTION,
      documentId: ID.unique(),
      data: {
        sku: normalizeSku(input.sku),
        name: input.name.trim(),
        barcode: input.barcode?.trim() || null,
        category_id: input.category_id,
        unit: input.unit.trim(),
        cost_price: input.cost_price,
        sell_price: input.sell_price,
        min_stock: input.min_stock,
        current_stock: 0,
        is_active: true,
        created_by: userId,
        created_at: now,
      },
      permissions: PRODUCT_DOC_PERMISSIONS,
    });
    return { ok: true, data: doc as unknown as Product };
  } catch (error) {
    // Jaring kemungkinan race: SKU/barcode bentrok di unique index.
    const duplicate = isDuplicateError(error);
    if (duplicate) {
      return {
        ok: false,
        errors: {
          [duplicate.field]:
            duplicate.field === "sku" ? "SKU sudah dipakai produk lain." : "Barcode sudah dipakai produk lain.",
        },
        code: "duplicate_field",
      };
    }
    console.error("createProduct failed:", error);
    return toAppwriteError("create_product_failed");
  }
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  userId: string
): Promise<Result<Product>> {
  const validated = validateProductInput(input);
  if (!validated.ok) return validated;

  const uniqueError = await assertUniqueFields(input, id);
  if (uniqueError) return { ok: false, errors: uniqueError };

  try {
    const doc = await adminDatabases().updateDocument({
      databaseId: INVENTORY_DATABASE_ID,
      collectionId: PRODUCTS_COLLECTION,
      documentId: id,
      data: {
        sku: normalizeSku(input.sku),
        name: input.name.trim(),
        barcode: input.barcode?.trim() || null,
        category_id: input.category_id,
        unit: input.unit.trim(),
        cost_price: input.cost_price,
        sell_price: input.sell_price,
        min_stock: input.min_stock,
        updated_by: userId,
        updated_at: nowIso(),
      },
    });
    return { ok: true, data: doc as unknown as Product };
  } catch (error) {
    const duplicate = isDuplicateError(error);
    if (duplicate) {
      return {
        ok: false,
        errors: {
          [duplicate.field]:
            duplicate.field === "sku" ? "SKU sudah dipakai produk lain." : "Barcode sudah dipakai produk lain.",
        },
        code: "duplicate_field",
      };
    }
    console.error("updateProduct failed:", error);
    return toAppwriteError("update_product_failed");
  }
}

export async function setProductActive(
  id: string,
  isActive: boolean,
  userId: string
): Promise<Result<Product>> {
  try {
    const doc = await adminDatabases().updateDocument({
      databaseId: INVENTORY_DATABASE_ID,
      collectionId: PRODUCTS_COLLECTION,
      documentId: id,
      data: {
        is_active: isActive,
        updated_by: userId,
        updated_at: nowIso(),
      },
    });
    return { ok: true, data: doc as unknown as Product };
  } catch (error) {
    console.error("setProductActive failed:", error);
    return toAppwriteError("update_product_failed");
  }
}
