import { readFileSync } from "node:fs";
import {
  Client,
  Databases,
  DatabasesIndexType,
  Permission,
  Role,
} from "node-appwrite";

const DATABASE_ID = "erp";

const INVENTORY_READ = ["admin", "warehouse", "purchasing", "sales", "finance"];

const MOVEMENT_TYPES = [
  "goods_receipt",
  "sales_invoice",
  "purchase_return",
  "sales_return",
  "stock_opname",
  "manual_adjustment",
];

const OPN_STATUS = ["draft", "posted", "cancelled"];

const WAREHOUSE_RW = [
  Permission.read(Role.label("admin")),
  Permission.read(Role.label("warehouse")),
  Permission.write(Role.label("admin")),
  Permission.write(Role.label("warehouse")),
];

const PURCHASING_READ = ["admin", "purchasing", "warehouse", "finance"].map((label) =>
  Permission.read(Role.label(label))
);
const PURCHASING_WRITE = ["admin", "purchasing"].map((label) =>
  Permission.write(Role.label(label))
);
const PURCHASING_RW = [...PURCHASING_READ, ...PURCHASING_WRITE];

const PO_STATUS = ["draft", "ordered", "partial", "received", "cancelled"];

const GR_STATUS = ["draft", "posted", "cancelled"];

const GR_READ = ["admin", "warehouse", "purchasing", "finance"].map((label) =>
  Permission.read(Role.label(label))
);
const GR_WRITE = ["admin", "warehouse"].map((label) =>
  Permission.write(Role.label(label))
);
const GR_RW = [...GR_READ, ...GR_WRITE];

const FINANCE_READ = ["admin", "finance"].map((label) =>
  Permission.read(Role.label(label))
);
const FINANCE_WRITE = ["admin", "finance"].map((label) =>
  Permission.write(Role.label(label))
);

const JOURNAL_NO_ROLE_WRITE = [];

const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"];

const COLLECTIONS = [
  {
    collectionId: "user_profiles",
    name: "User Profiles",
    permissions: [
      Permission.read(Role.label("admin")),
      Permission.write(Role.label("admin")),
    ],
    attributes: [
      { key: "user_id", type: "string", size: 36, required: true },
      { key: "full_name", type: "string", size: 255, required: true },
      {
        key: "role",
        type: "enum",
        elements: ["admin", "warehouse", "purchasing", "sales", "finance", "hr"],
        required: true,
      },
      { key: "team_ids", type: "string", size: 36, required: false, array: true },
      { key: "is_active", type: "boolean", required: true },
      { key: "created_by", type: "string", size: 36, required: true },
      { key: "created_at", type: "string", size: 40, required: true },
      { key: "updated_by", type: "string", size: 36, required: false },
      { key: "updated_at", type: "string", size: 40, required: false },
    ],
    indexes: [
      { key: "idx_user_id", type: DatabasesIndexType.Unique, attributes: ["user_id"] },
      { key: "idx_role", type: DatabasesIndexType.Key, attributes: ["role"] },
    ],
  },
  {
    collectionId: "product_categories",
    name: "Product Categories",
    permissions: [
      ...INVENTORY_READ.map((label) => Permission.read(Role.label(label))),
      Permission.write(Role.label("admin")),
      Permission.write(Role.label("warehouse")),
    ],
    attributes: [
      { key: "name", type: "string", size: 255, required: true },
      { key: "description", type: "string", size: 500, required: false },
      { key: "is_active", type: "boolean", required: true },
      { key: "created_by", type: "string", size: 36, required: true },
      { key: "created_at", type: "string", size: 40, required: true },
      { key: "updated_by", type: "string", size: 36, required: false },
      { key: "updated_at", type: "string", size: 40, required: false },
    ],
    indexes: [],
  },
  {
    collectionId: "products",
    name: "Products",
    permissions: [
      ...INVENTORY_READ.map((label) => Permission.read(Role.label(label))),
      Permission.write(Role.label("admin")),
      Permission.write(Role.label("warehouse")),
    ],
    attributes: [
      { key: "sku", type: "string", size: 255, required: true },
      { key: "name", type: "string", size: 255, required: true },
      { key: "barcode", type: "string", size: 255, required: false },
      { key: "category_id", type: "string", size: 36, required: true },
      { key: "unit", type: "string", size: 50, required: true },
      { key: "cost_price", type: "number", required: true },
      { key: "sell_price", type: "number", required: true },
      { key: "min_stock", type: "number", required: true },
      { key: "current_stock", type: "number", required: true },
      { key: "is_active", type: "boolean", required: true },
      { key: "created_by", type: "string", size: 36, required: true },
      { key: "created_at", type: "string", size: 40, required: true },
      { key: "updated_by", type: "string", size: 36, required: false },
      { key: "updated_at", type: "string", size: 40, required: false },
    ],
    indexes: [
      { key: "idx_sku", type: DatabasesIndexType.Unique, attributes: ["sku"] },
      { key: "idx_barcode", type: DatabasesIndexType.Unique, attributes: ["barcode"] },
      { key: "idx_category_id", type: DatabasesIndexType.Key, attributes: ["category_id"] },
      { key: "idx_is_active", type: DatabasesIndexType.Key, attributes: ["is_active"] },
    ],
  },
  {
    collectionId: "stock_movements",
    name: "Stock Movements",
    permissions: [
      Permission.read(Role.label("admin")),
      Permission.read(Role.label("warehouse")),
      Permission.read(Role.label("finance")),
    ],
    attributes: [
      { key: "product_id", type: "string", size: 36, required: true },
      {
        key: "movement_type",
        type: "enum",
        elements: MOVEMENT_TYPES,
        required: true,
      },
      { key: "quantity_delta", type: "number", required: true },
      { key: "source_type", type: "string", size: 40, required: true },
      { key: "source_id", type: "string", size: 36, required: true },
      { key: "note", type: "string", size: 500, required: false },
      { key: "created_by", type: "string", size: 36, required: true },
      { key: "created_at", type: "string", size: 40, required: true },
    ],
    indexes: [
      {
        key: "idx_product_created",
        type: DatabasesIndexType.Key,
        attributes: ["product_id", "created_at"],
      },
      {
        key: "idx_source",
        type: DatabasesIndexType.Key,
        attributes: ["source_type", "source_id"],
      },
    ],
  },
  {
    collectionId: "stock_opnames",
    name: "Stock Opnames",
    permissions: WAREHOUSE_RW,
    attributes: [
      { key: "opname_number", type: "string", size: 255, required: true },
      { key: "opname_date", type: "string", size: 40, required: true },
      {
        key: "status",
        type: "enum",
        elements: OPN_STATUS,
        required: true,
      },
      { key: "note", type: "string", size: 500, required: false },
      { key: "created_by", type: "string", size: 36, required: true },
      { key: "created_at", type: "string", size: 40, required: true },
      { key: "posted_by", type: "string", size: 36, required: false },
      { key: "posted_at", type: "string", size: 40, required: false },
    ],
    indexes: [
      {
        key: "idx_opname_number",
        type: DatabasesIndexType.Unique,
        attributes: ["opname_number"],
      },
      { key: "idx_status", type: DatabasesIndexType.Key, attributes: ["status"] },
    ],
  },
  {
    collectionId: "stock_opname_items",
    name: "Stock Opname Items",
    permissions: WAREHOUSE_RW,
    attributes: [
      { key: "stock_opname_id", type: "string", size: 36, required: true },
      { key: "product_id", type: "string", size: 36, required: true },
      { key: "system_qty", type: "number", required: true },
      { key: "actual_qty", type: "number", required: true },
      { key: "difference", type: "number", required: true },
      { key: "note", type: "string", size: 500, required: false },
    ],
    indexes: [
      {
        key: "idx_stock_opname_id",
        type: DatabasesIndexType.Key,
        attributes: ["stock_opname_id"],
      },
      { key: "idx_product_id", type: DatabasesIndexType.Key, attributes: ["product_id"] },
    ],
  },
  {
    collectionId: "suppliers",
    name: "Suppliers",
    permissions: [
      Permission.read(Role.label("admin")),
      Permission.read(Role.label("purchasing")),
      Permission.read(Role.label("finance")),
      Permission.read(Role.label("warehouse")),
      Permission.write(Role.label("admin")),
      Permission.write(Role.label("purchasing")),
    ],
    attributes: [
      { key: "code", type: "string", size: 50, required: true },
      { key: "name", type: "string", size: 255, required: true },
      { key: "contact_person", type: "string", size: 255, required: false },
      { key: "phone", type: "string", size: 50, required: false },
      { key: "email", type: "string", size: 255, required: false },
      { key: "address", type: "string", size: 500, required: false },
      { key: "payment_terms", type: "string", size: 50, required: false },
      { key: "is_active", type: "boolean", required: true },
      { key: "created_by", type: "string", size: 36, required: true },
      { key: "created_at", type: "string", size: 40, required: true },
      { key: "updated_by", type: "string", size: 36, required: false },
      { key: "updated_at", type: "string", size: 40, required: false },
    ],
    indexes: [
      { key: "idx_code", type: DatabasesIndexType.Unique, attributes: ["code"] },
      { key: "idx_is_active", type: DatabasesIndexType.Key, attributes: ["is_active"] },
    ],
  },
  {
    collectionId: "purchase_orders",
    name: "Purchase Orders",
    permissions: PURCHASING_RW,
    attributes: [
      { key: "po_number", type: "string", size: 255, required: true },
      { key: "supplier_id", type: "string", size: 36, required: true },
      { key: "order_date", type: "string", size: 40, required: true },
      { key: "expected_date", type: "string", size: 40, required: false },
      {
        key: "status",
        type: "enum",
        elements: PO_STATUS,
        required: true,
      },
      { key: "total_amount", type: "number", required: true },
      { key: "notes", type: "string", size: 500, required: false },
      { key: "created_by", type: "string", size: 36, required: true },
      { key: "created_at", type: "string", size: 40, required: true },
      { key: "updated_by", type: "string", size: 36, required: false },
      { key: "updated_at", type: "string", size: 40, required: false },
    ],
    indexes: [
      {
        key: "idx_po_number",
        type: DatabasesIndexType.Unique,
        attributes: ["po_number"],
      },
      { key: "idx_supplier_id", type: DatabasesIndexType.Key, attributes: ["supplier_id"] },
      { key: "idx_status", type: DatabasesIndexType.Key, attributes: ["status"] },
    ],
  },
  {
    collectionId: "purchase_order_items",
    name: "Purchase Order Items",
    permissions: PURCHASING_RW,
    attributes: [
      { key: "purchase_order_id", type: "string", size: 36, required: true },
      { key: "product_id", type: "string", size: 36, required: true },
      { key: "quantity", type: "number", required: true },
      { key: "unit_price", type: "number", required: true },
      { key: "line_total", type: "number", required: true },
    ],
    indexes: [
      {
        key: "idx_purchase_order_id",
        type: DatabasesIndexType.Key,
        attributes: ["purchase_order_id"],
      },
      { key: "idx_product_id", type: DatabasesIndexType.Key, attributes: ["product_id"] },
    ],
  },
  {
    collectionId: "goods_receipts",
    name: "Goods Receipts",
    permissions: GR_RW,
    attributes: [
      { key: "gr_number", type: "string", size: 255, required: true },
      { key: "purchase_order_id", type: "string", size: 36, required: true },
      { key: "received_date", type: "string", size: 40, required: true },
      {
        key: "status",
        type: "enum",
        elements: GR_STATUS,
        required: true,
      },
      { key: "notes", type: "string", size: 500, required: false },
      { key: "created_by", type: "string", size: 36, required: true },
      { key: "created_at", type: "string", size: 40, required: true },
      { key: "posted_by", type: "string", size: 36, required: false },
      { key: "posted_at", type: "string", size: 40, required: false },
    ],
    indexes: [
      { key: "idx_gr_number", type: DatabasesIndexType.Unique, attributes: ["gr_number"] },
      { key: "idx_purchase_order_id", type: DatabasesIndexType.Key, attributes: ["purchase_order_id"] },
      { key: "idx_status", type: DatabasesIndexType.Key, attributes: ["status"] },
    ],
  },
  {
    collectionId: "goods_receipt_items",
    name: "Goods Receipt Items",
    permissions: GR_RW,
    attributes: [
      { key: "goods_receipt_id", type: "string", size: 36, required: true },
      { key: "purchase_order_item_id", type: "string", size: 36, required: true },
      { key: "product_id", type: "string", size: 36, required: true },
      { key: "quantity_received", type: "number", required: true },
    ],
    indexes: [
      { key: "idx_goods_receipt_id", type: DatabasesIndexType.Key, attributes: ["goods_receipt_id"] },
      { key: "idx_purchase_order_item_id", type: DatabasesIndexType.Key, attributes: ["purchase_order_item_id"] },
    ],
  },
  {
    collectionId: "chart_of_accounts",
    name: "Chart of Accounts",
    permissions: [...FINANCE_READ, ...FINANCE_WRITE],
    attributes: [
      { key: "code", type: "string", size: 50, required: true },
      { key: "name", type: "string", size: 255, required: true },
      {
        key: "account_type",
        type: "enum",
        elements: ACCOUNT_TYPES,
        required: true,
      },
      { key: "parent_account_id", type: "string", size: 36, required: false },
      { key: "is_active", type: "boolean", required: true },
      { key: "created_by", type: "string", size: 36, required: true },
      { key: "created_at", type: "string", size: 40, required: true },
      { key: "updated_by", type: "string", size: 36, required: false },
      { key: "updated_at", type: "string", size: 40, required: false },
    ],
    indexes: [
      { key: "idx_code", type: DatabasesIndexType.Unique, attributes: ["code"] },
      { key: "idx_account_type", type: DatabasesIndexType.Key, attributes: ["account_type"] },
    ],
  },
  {
    collectionId: "journal_entries",
    name: "Journal Entries",
    permissions: [...FINANCE_READ, ...JOURNAL_NO_ROLE_WRITE],
    attributes: [
      { key: "entry_number", type: "string", size: 255, required: true },
      { key: "entry_date", type: "string", size: 40, required: true },
      { key: "source_type", type: "string", size: 40, required: true },
      { key: "source_id", type: "string", size: 36, required: true },
      { key: "description", type: "string", size: 500, required: true },
      { key: "total_debit", type: "number", required: true },
      { key: "total_credit", type: "number", required: true },
      {
        key: "status",
        type: "enum",
        elements: ["posted", "reversed"],
        required: true,
      },
      { key: "reversed_by_entry_id", type: "string", size: 36, required: false },
      { key: "reversed_at", type: "string", size: 40, required: false },
      { key: "created_by", type: "string", size: 36, required: true },
      { key: "created_at", type: "string", size: 40, required: true },
    ],
    indexes: [
      { key: "idx_entry_number", type: DatabasesIndexType.Unique, attributes: ["entry_number"] },
      { key: "idx_entry_date", type: DatabasesIndexType.Key, attributes: ["entry_date"] },
      { key: "idx_source", type: DatabasesIndexType.Key, attributes: ["source_type", "source_id"] },
    ],
  },
  {
    collectionId: "journal_entry_lines",
    name: "Journal Entry Lines",
    permissions: [...FINANCE_READ, ...JOURNAL_NO_ROLE_WRITE],
    attributes: [
      { key: "journal_entry_id", type: "string", size: 36, required: true },
      { key: "account_id", type: "string", size: 36, required: true },
      { key: "debit", type: "number", required: true },
      { key: "credit", type: "number", required: true },
      { key: "description", type: "string", size: 500, required: false },
    ],
    indexes: [
      { key: "idx_journal_entry_id", type: DatabasesIndexType.Key, attributes: ["journal_entry_id"] },
      { key: "idx_account_id", type: DatabasesIndexType.Key, attributes: ["account_id"] },
    ],
  },
];

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  const get = (name) => raw.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]?.trim();
  return {
    endpoint: get("NEXT_PUBLIC_APPWRITE_ENDPOINT"),
    projectId: get("NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
    apiKey: get("APPWRITE_API_KEY"),
  };
}

const { endpoint, projectId, apiKey } = loadEnv();
if (!endpoint || !projectId || !apiKey) {
  console.error("Env tidak lengkap. Cek .env.local.");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

async function createAttributes(collectionId, attributes) {
  for (const attr of attributes) {
    const params = {
      databaseId: DATABASE_ID,
      collectionId,
      key: attr.key,
      required: attr.required,
    };
    if ("size" in attr) params.size = attr.size;
    if ("elements" in attr) params.elements = attr.elements;
    if ("xdefault" in attr) params.xdefault = attr.xdefault;
    if ("array" in attr) params.array = attr.array;

    const fn = {
      string: "createStringAttribute",
      enum: "createEnumAttribute",
      boolean: "createBooleanAttribute",
      number: "createFloatAttribute",
    }[attr.type];

    try {
      await databases[fn](params);
      console.log(`  [ok] attribute ${collectionId}.${attr.key}`);
    } catch (e) {
      if (e.code === 409) {
        console.log(`  [skip] attribute ${collectionId}.${attr.key} sudah ada`);
      } else {
        throw e;
      }
    }
  }
}

async function createIndexes(collectionId, indexes) {
  for (const idx of indexes) {
    try {
      await databases.createIndex({
        databaseId: DATABASE_ID,
        collectionId,
        key: idx.key,
        type: idx.type,
        attributes: idx.attributes,
      });
      console.log(`  [ok] index ${collectionId}.${idx.key}`);
    } catch (e) {
      if (e.code === 409) {
        console.log(`  [skip] index ${collectionId}.${idx.key} sudah ada`);
      } else {
        throw e;
      }
    }
  }
}

async function ensureDatabase() {
  const list = await databases.list();
  if (list.databases.some((d) => d.$id === DATABASE_ID)) {
    console.log(`[skip] database "${DATABASE_ID}" sudah ada`);
    return;
  }
  await databases.create({ databaseId: DATABASE_ID, name: "ERP Retail" });
  console.log(`[ok] database "${DATABASE_ID}" dibuat`);
}

async function main() {
  await ensureDatabase();

  for (const col of COLLECTIONS) {
    try {
      await databases.createCollection({
        databaseId: DATABASE_ID,
        collectionId: col.collectionId,
        name: col.name,
        permissions: col.permissions,
        documentSecurity: true,
      });
      console.log(`[ok] collection "${col.collectionId}" dibuat`);
    } catch (e) {
      if (e.code === 409) {
        console.log(`[skip] collection "${col.collectionId}" sudah ada`);
      } else {
        throw e;
      }
    }

    await createAttributes(col.collectionId, col.attributes);
    await createIndexes(col.collectionId, col.indexes);
  }
}

main().catch((e) => {
  console.error("Gagal setup database:", e.message);
  process.exit(1);
});
