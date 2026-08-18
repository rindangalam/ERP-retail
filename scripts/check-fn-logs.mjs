import { readFileSync } from "node:fs";
import { Client, Functions } from "node-appwrite";

const raw = readFileSync(".env.local", "utf8");
const get = (name) => raw.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]?.trim();

const client = new Client()
  .setEndpoint(get("NEXT_PUBLIC_APPWRITE_ENDPOINT"))
  .setProject(get("NEXT_PUBLIC_APPWRITE_PROJECT_ID"))
  .setKey(get("APPWRITE_API_KEY"));

const functions = new Functions(client);

// First, run a new execution so we know the ID
console.log("Running sales_invoice test...");
const run = await functions.createExecution({
  functionId: "post-stock-opname",
  body: JSON.stringify({ type: "sales_invoice", sales_invoice_id: "test-debug", created_by: "test" }),
  async: false,
});
console.log("Execution ID:", run.$id);
console.log("Status:", run.status);
console.log("Code:", run.responseStatusCode);
console.log("Body:", run.responseBody);
console.log("Stderr:", run.stderr);
console.log("Logs:", run.logs);

// Now try to fetch it
console.log("\n--- Fetching by ID ---");
try {
  const fetched = await functions.getExecution({ functionId: "post-stock-opname", executionId: run.$id });
  console.log("Fetched status:", fetched.status);
  console.log("Fetched code:", fetched.responseStatusCode);
  console.log("Fetched body:", fetched.responseBody);
  console.log("Fetched stderr:", fetched.stderr);
  console.log("Fetched logs:", fetched.logs);
} catch (e) {
  console.log("Fetch error:", e.message);
}

// Also try listExecutions with search
console.log("\n--- listExecutions ---");
const list = await functions.listExecutions({ functionId: "post-stock-opname", queries: [] });
console.log("Total executions:", list.total);
for (const ex of list.executions.slice(0, 2)) {
  console.log(`  ${ex.$id} | ${ex.status} | code=${ex.responseStatusCode} | body=${ex.responseBody?.substring(0, 200)} | stderr=${ex.stderr} | logs=${ex.logs}`);
}
