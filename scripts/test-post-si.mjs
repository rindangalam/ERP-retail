import { readFileSync } from "node:fs";
import { Client, Functions, Databases, ID, Query } from "node-appwrite";

const raw = readFileSync(".env.local", "utf8");
const get = (name) => raw.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]?.trim();

const client = new Client()
  .setEndpoint(get("NEXT_PUBLIC_APPWRITE_ENDPOINT"))
  .setProject(get("NEXT_PUBLIC_APPWRITE_PROJECT_ID"))
  .setKey(get("APPWRITE_API_KEY"));

const db = new Databases(client);
const functions = new Functions(client);
const DB_ID = "erp";

// Test 1: stock_opname (existing type) to verify function works
console.log("=== Test 1: stock_opname (smoke test) ===");
try {
  const run = await functions.createExecution({
    functionId: "post-stock-opname",
    body: JSON.stringify({ type: "stock_opname", stock_opname_id: "nonexistent", created_by: "test" }),
    async: false,
  });
  console.log("Status:", run.responseStatusCode, "(expected 404)");
  console.log("Body:", run.responseBody?.substring(0, 300));
} catch (e) {
  console.error("Error:", e.message);
}

// Test 2: sales_invoice
console.log("\n=== Test 2: sales_invoice ===");
try {
  const run = await functions.createExecution({
    functionId: "post-stock-opname",
    body: JSON.stringify({ type: "sales_invoice", sales_invoice_id: "nonexistent", created_by: "test" }),
    async: false,
  });
  console.log("Status:", run.responseStatusCode, "(expected 404)");
  console.log("Body:", run.responseBody?.substring(0, 300));
} catch (e) {
  console.error("Error:", e.message);
}

// Test 3: create a real invoice and post it
console.log("\n=== Test 3: create real invoice + post ===");

// Get a confirmed SO
const soResult = await db.listDocuments(DB_ID, "sales_orders", [Query.equal("status", ["confirmed"])]);
if (soResult.documents.length === 0) {
  console.log("No confirmed SOs. Creating one...");
  // Get customer and product
  const custResult = await db.listDocuments(DB_ID, "customers", [Query.equal("is_active", [true])]);
  const prodResult = await db.listDocuments(DB_ID, "products", [Query.equal("is_active", [true])]);
  if (custResult.documents.length === 0 || prodResult.documents.length === 0) {
    console.log("Need customer + product first");
    process.exit(1);
  }
  const customer_id = custResult.documents[0].$id;
  const product_id = prodResult.documents[0].$id;
  const now = new Date().toISOString();
  
  const so = await db.createDocument({
    databaseId: DB_ID, collectionId: "sales_orders", documentId: ID.unique(),
    data: { so_number: "SO-TEST-FN-" + Date.now(), customer_id, order_date: now.slice(0, 10),
            expected_date: now.slice(0, 10), status: "confirmed", total_amount: 100000,
            notes: "test", created_by: "admin", created_at: now },
  });
  await db.createDocument({
    databaseId: DB_ID, collectionId: "sales_order_items", documentId: ID.unique(),
    data: { sales_order_id: so.$id, product_id, quantity: 2, unit_price: 50000, line_total: 100000 },
  });
  soResult.documents.push(so);
  console.log("Created SO:", so.$id, so.so_number);
}

const so = soResult.documents[0];
const siItems = await db.listDocuments(DB_ID, "sales_order_items", [
  Query.equal("sales_order_id", [so.$id]),
]);
const soItem = siItems.documents[0];
console.log("SO:", so.so_number, "Item:", soItem.product_id, "qty:", soItem.quantity);

// Ensure product has stock movements (stock is calculated from movements, not current_stock field)
const existingMovements = await db.listDocuments(DB_ID, "stock_movements", [
  Query.equal("product_id", [soItem.product_id]),
  Query.equal("movement_type", ["adjustment"]),
]);
if (existingMovements.documents.length === 0) {
  console.log("Creating initial stock movement for product");
  const now2 = new Date().toISOString();
  await db.createDocument({
    databaseId: DB_ID, collectionId: "stock_movements", documentId: ID.unique(),
    data: {
      product_id: soItem.product_id,
      movement_type: "manual_adjustment",
      quantity_delta: 100,
      source_type: "stock_opname",
      source_id: "seed",
      note: "Initial stock for test",
      created_by: "system",
      created_at: now2,
    },
  });
  console.log("Stock movement created");
}

const now = new Date().toISOString();
const inv = await db.createDocument({
  databaseId: DB_ID, collectionId: "sales_invoices", documentId: ID.unique(),
  data: {
    invoice_number: "INV-FN-" + Date.now(),
    sales_order_id: so.$id,
    customer_id: so.customer_id,
    invoice_date: now.slice(0, 10),
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    subtotal: soItem.quantity * soItem.unit_price,
    discount: 0, tax: 0,
    total_amount: soItem.quantity * soItem.unit_price,
    status: "draft",
    stock_override: null, override_by: null, override_note: null,
    created_by: "admin", created_at: now,
  },
});
await db.createDocument({
  databaseId: DB_ID, collectionId: "sales_invoice_items", documentId: ID.unique(),
  data: { sales_invoice_id: inv.$id, sales_order_item_id: soItem.$id, product_id: soItem.product_id,
          quantity: soItem.quantity, unit_price: soItem.unit_price, line_total: soItem.quantity * soItem.unit_price },
});
console.log("Created invoice:", inv.$id, inv.invoice_number);

// Post it
try {
  const run = await functions.createExecution({
    functionId: "post-stock-opname",
    body: JSON.stringify({ type: "sales_invoice", sales_invoice_id: inv.$id, created_by: "admin" }),
    async: false,
  });
  console.log("Status:", run.responseStatusCode);
  console.log("Body:", run.responseBody?.substring(0, 500));
  console.log("Stderr:", run.stderr?.substring(0, 500));
} catch (e) {
  console.error("Error:", e.message);
}
