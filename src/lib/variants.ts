import "server-only";
import { ID, Permission, Query, Role } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";
import { normalizeSku } from "./inventory-validation";
import { isVariantDuplicateError, validateVariantInput, type VariantInput } from "./variant-validation";

// Bentuk Result diselaraskan dengan src/lib/inventory.ts:
// ({ok:true,data} | {ok:false,errors,code?}) agar konsumen dan
// pola "duplicate_field" konsisten antar DAL.
export type VariantResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; code?: string };

export type ProductVariant = {
  $id: string;
  product_id: string;
  size: string;
  color: string;
  sku: string;
  barcode: string | null;
  sell_price: number | null;
  min_stock: number;
  current_stock: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
};

const VARIANTS_DATABASE_ID = "erp";
const PRODUCT_VARIANTS_COLLECTION = "product_variants";

const VARIANT_DOC_READ = ["admin", "warehouse", "purchasing", "sales", "finance"].map((label) =>
  Permission.read(Role.label(label)),
);
const VARIANT_DOC_WRITE = ["admin", "warehouse"].map((label) =>
  Permission.write(Role.label(label)),
);

const VARIANT_DOC_PERMISSIONS = [...VARIANT_DOC_READ, ...VARIANT_DOC_WRITE];

function nowIso(): string {
  return new Date().toISOString();
}

// Appwrite mengembalikan class instance (Models.Document) yang tidak bisa
// diserialisasi ke Client Component. Spread ke plain object dulu.
function toPlain<T extends Record<string, unknown>>(doc: T): T {
  return { ...doc };
}

export async function listVariants(productId: string): Promise<ProductVariant[]> {
  const result = await adminDatabases().listDocuments(
    VARIANTS_DATABASE_ID,
    PRODUCT_VARIANTS_COLLECTION,
    [Query.equal("product_id", [productId])],
  );
  const variants = result.documents as unknown as ProductVariant[];
  return variants
    .map(toPlain)
    .sort(
      (a, b) =>
        a.size.localeCompare(b.size, "id") || a.color.localeCompare(b.color, "id"),
    );
}

// Batch: 1 query melayani s.d. 30 product_id (hindari N+1 Promise.all
// listVariants per produk). Pola chunk 30 meniru boutique-reports.ts
// getItemsForInvoices; group by product_id di memori.
export async function listVariantsByProductIds(
  ids: string[],
): Promise<Record<string, ProductVariant[]>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return {};
  const all: ProductVariant[] = [];
  for (let i = 0; i < uniqueIds.length; i += 30) {
    const chunk = uniqueIds.slice(i, i + 30);
    let offset = 0;
    for (;;) {
      const result = await adminDatabases().listDocuments(
        VARIANTS_DATABASE_ID,
        PRODUCT_VARIANTS_COLLECTION,
        [Query.equal("product_id", chunk), Query.limit(100), Query.offset(offset)],
      );
      all.push(...(result.documents as unknown as ProductVariant[]));
      if (result.documents.length < 100) break;
      offset += 100;
    }
  }
  const grouped: Record<string, ProductVariant[]> = {};
  for (const v of all.map(toPlain)) {
    (grouped[v.product_id] ??= []).push(v);
  }
  for (const vs of Object.values(grouped)) {
    vs.sort(
      (a, b) =>
        a.size.localeCompare(b.size, "id") || a.color.localeCompare(b.color, "id"),
    );
  }
  return grouped;
}

async function findVariantBySku(sku: string): Promise<ProductVariant | null> {
  const result = await adminDatabases().listDocuments(
    VARIANTS_DATABASE_ID,
    PRODUCT_VARIANTS_COLLECTION,
    [Query.equal("sku", [normalizeSku(sku)])],
  );
  return (result.documents[0] as unknown as ProductVariant) ?? null;
}

async function findVariantByBarcode(barcode: string): Promise<ProductVariant | null> {
  if (!barcode?.trim()) return null;
  const result = await adminDatabases().listDocuments(
    VARIANTS_DATABASE_ID,
    PRODUCT_VARIANTS_COLLECTION,
    [Query.equal("barcode", [barcode.trim()])],
  );
  return (result.documents[0] as unknown as ProductVariant) ?? null;
}

export async function createVariant(
  input: VariantInput,
  userId: string,
): Promise<VariantResult<ProductVariant>> {
  const validated = validateVariantInput(input);
  if (!validated.ok) return validated;

  const sku = normalizeSku(input.sku);
  const existing = await findVariantBySku(sku);
  if (existing) {
    return { ok: false, errors: { sku: "SKU sudah dipakai varian lain." } };
  }

  if (input.barcode?.trim()) {
    const existingBarcode = await findVariantByBarcode(input.barcode);
    if (existingBarcode) {
      return { ok: false, errors: { barcode: "Barcode sudah dipakai varian lain." } };
    }
  }

  const now = nowIso();
  try {
    const doc = await adminDatabases().createDocument({
      databaseId: VARIANTS_DATABASE_ID,
      collectionId: PRODUCT_VARIANTS_COLLECTION,
      documentId: ID.unique(),
      data: {
        product_id: input.product_id.trim(),
        size: input.size?.trim() ?? "",
        color: input.color?.trim() ?? "",
        sku,
        barcode: input.barcode?.trim() || null,
        sell_price: input.sell_price ?? null,
        min_stock: input.min_stock,
        current_stock: 0,
        is_active: true,
        created_by: userId,
        created_at: now,
      },
      permissions: VARIANT_DOC_PERMISSIONS,
    });
    return { ok: true, data: toPlain(doc as unknown as ProductVariant) };
  } catch (error) {
    // Jaring kemungkinan race: SKU/barcode bentrok di unique index.
    const duplicate = isVariantDuplicateError(error);
    if (duplicate) {
      return {
        ok: false,
        errors: {
          [duplicate.field]:
            duplicate.field === "sku"
              ? "SKU sudah dipakai varian lain."
              : "Barcode sudah dipakai varian lain.",
        },
        code: "duplicate_field",
      };
    }
    console.error("createVariant failed:", error);
    return { ok: false, errors: {} };
  }
}

export async function setVariantActive(
  id: string,
  isActive: boolean,
  userId: string,
): Promise<{ ok: boolean }> {
  try {
    await adminDatabases().updateDocument({
      databaseId: VARIANTS_DATABASE_ID,
      collectionId: PRODUCT_VARIANTS_COLLECTION,
      documentId: id,
      data: {
        is_active: isActive,
        updated_by: userId,
        updated_at: nowIso(),
      },
    });
    return { ok: true };
  } catch (error) {
    console.error("setVariantActive failed:", error);
    return { ok: false };
  }
}
