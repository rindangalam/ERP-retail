import "server-only";
import { ID, Permission, Query, Role } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";
import { normalizeSku } from "./inventory-validation";
import { validateVariantInput, type VariantInput } from "./variant-validation";

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

async function findVariantBySku(sku: string): Promise<ProductVariant | null> {
  const result = await adminDatabases().listDocuments(
    VARIANTS_DATABASE_ID,
    PRODUCT_VARIANTS_COLLECTION,
    [Query.equal("sku", [normalizeSku(sku)])],
  );
  return (result.documents[0] as unknown as ProductVariant) ?? null;
}

export async function createVariant(
  input: VariantInput,
  userId: string,
): Promise<{ ok: true; data: ProductVariant } | { ok: false; errors: Record<string, string> }> {
  const validated = validateVariantInput(input);
  if (!validated.ok) return validated;

  const sku = normalizeSku(input.sku);
  const existing = await findVariantBySku(sku);
  if (existing) {
    return { ok: false, errors: { sku: "SKU sudah dipakai varian lain." } };
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
    const message = error instanceof Error ? error.message : String(error);
    if (/unique|duplicate|already exists/i.test(message)) {
      return { ok: false, errors: { sku: "SKU sudah dipakai varian lain." } };
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
