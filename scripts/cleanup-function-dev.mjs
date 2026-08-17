import { readFileSync, rmSync } from "node:fs";
import { Client, Databases, Functions, Query } from "node-appwrite";

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

const databases = new Databases(client);
const functions = new Functions(client);

const product = (
  await databases.listDocuments("erp", "products", [Query.equal("sku", ["AM-600"])])
).documents[0];

let page = await databases.listDocuments("erp", "stock_movements", [
  Query.equal("product_id", [product.$id]),
  Query.limit(100),
]);
for (const doc of page.documents) {
  await databases.deleteDocument("erp", "stock_movements", doc.$id);
}
await databases.updateDocument("erp", "products", product.$id, { current_stock: 0 });
console.log(`cleaned ${page.total} movements, current_stock -> 0`);

try {
  await functions.delete({ functionId: "mini-probe" });
  console.log("function mini-probe dihapus");
} catch (e) {
  console.log("mini-probe:", e.type, e.message);
}

rmSync(".tmp-deploy", { recursive: true, force: true });
console.log(".tmp-deploy dihapus");
