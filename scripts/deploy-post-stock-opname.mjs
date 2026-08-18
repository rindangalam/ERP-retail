import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { Client, Functions, ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const functions = new Functions(client);

const FUNCTION_ID = "post-stock-opname";
const FUNCTION_NAME = "postStockOpname";
const ENTRYPOINT = "src/index.js";
const COMMANDS = "npm install --omit=dev";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureFunction() {
  const list = await functions.list();
  const existing = list.functions.find((f) => f.$id === FUNCTION_ID);
  if (existing) {
    console.log(`[skip] function "${FUNCTION_ID}" sudah ada (runtime ${existing.runtime})`);
    return existing;
  }
  const created = await functions.create({
    functionId: FUNCTION_ID,
    name: FUNCTION_NAME,
    runtime: "node-22",
    execute: ["any"],
    entrypoint: ENTRYPOINT,
    commands: COMMANDS,
  });
  console.log(`[ok] function "${FUNCTION_ID}" dibuat (runtime ${created.runtime})`);
  return created;
}

async function ensureVariable(functionId, key, value, secret = false) {
  const existing = await functions.listVariables({ functionId });
  if (existing.variables.some((v) => v.key === key)) {
    console.log(`[skip] variable ${key} sudah ada`);
    return;
  }
  await functions.createVariable({ functionId, variableId: ID.unique(), key, value, secret });
  console.log(`[ok] variable ${key} dibuat`);
}

async function deploy(functionId) {
  const tmpDir = path.join(process.cwd(), ".tmp-deploy");
  mkdirSync(tmpDir, { recursive: true });
  const tarPath = path.join(tmpDir, "post-stock-opname.tar.gz");
  rmSync(tarPath, { force: true });

  const funcDir = path.join(process.cwd(), "functions", "postStockOpname");
  execSync(
    `tar -czf "${tarPath}" --exclude=node_modules --exclude=test -C "${funcDir}" .`,
    { stdio: "inherit" }
  );
  console.log("[ok] tarball dibuat:", tarPath);

  const deployment = await functions.createDeployment({
    functionId,
    code: InputFile.fromPath(tarPath, "post-stock-opname.tar.gz"),
    activate: true,
    entrypoint: ENTRYPOINT,
    commands: COMMANDS,
  });
  console.log("[ok] deployment dibuat:", deployment.$id);

  for (let i = 0; i < 40; i++) {
    const status = await functions.getDeployment({ functionId, deploymentId: deployment.$id });
    if (status.status === "ready") {
      console.log(`[ok] build selesai (${i * 5}s)`);
      return;
    }
    if (status.status === "failed") throw new Error("Build deployment gagal di Appwrite.");
    await sleep(5000);
  }
  throw new Error("Timeout menunggu build.");
}

const fn = await ensureFunction();
await ensureVariable(fn.$id, "APPWRITE_FUNCTION_API_KEY", env.APPWRITE_API_KEY, true);
await ensureVariable(fn.$id, "ERP_DATABASE_ID", "erp");
await ensureVariable(fn.$id, "ERP_PRODUCTS_COLLECTION", "products");
await ensureVariable(fn.$id, "ERP_STOCK_MOVEMENTS_COLLECTION", "stock_movements");
await ensureVariable(fn.$id, "ERP_STOCK_OPNAMES_COLLECTION", "stock_opnames");
await ensureVariable(fn.$id, "ERP_STOCK_OPNAME_ITEMS_COLLECTION", "stock_opname_items");
await ensureVariable(fn.$id, "ERP_GOODS_RECEIPTS_COLLECTION", "goods_receipts");
await ensureVariable(fn.$id, "ERP_GOODS_RECEIPT_ITEMS_COLLECTION", "goods_receipt_items");
await ensureVariable(fn.$id, "ERP_PURCHASE_ORDERS_COLLECTION", "purchase_orders");
await ensureVariable(fn.$id, "ERP_PURCHASE_ORDER_ITEMS_COLLECTION", "purchase_order_items");
await ensureVariable(fn.$id, "ERP_CHART_OF_ACCOUNTS_COLLECTION", "chart_of_accounts");
await ensureVariable(fn.$id, "ERP_JOURNAL_ENTRIES_COLLECTION", "journal_entries");
await ensureVariable(fn.$id, "ERP_JOURNAL_ENTRY_LINES_COLLECTION", "journal_entry_lines");
await ensureVariable(fn.$id, "ERP_PURCHASE_RETURNS_COLLECTION", "purchase_returns");
await ensureVariable(fn.$id, "ERP_PURCHASE_RETURN_ITEMS_COLLECTION", "purchase_return_items");
await ensureVariable(fn.$id, "ERP_SALES_INVOICES_COLLECTION", "sales_invoices");
await ensureVariable(fn.$id, "ERP_SALES_INVOICE_ITEMS_COLLECTION", "sales_invoice_items");
await ensureVariable(fn.$id, "ERP_SALES_ORDERS_COLLECTION", "sales_orders");
await ensureVariable(fn.$id, "ERP_SALES_ORDER_ITEMS_COLLECTION", "sales_order_items");
await ensureVariable(fn.$id, "ERP_SALES_RETURNS_COLLECTION", "sales_returns");
await ensureVariable(fn.$id, "ERP_SALES_RETURN_ITEMS_COLLECTION", "sales_return_items");
await deploy(fn.$id);
console.log("SELESAI: postStockOpname ter-deploy.");
