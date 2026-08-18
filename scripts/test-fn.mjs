import { readFileSync } from "node:fs";
import { Client, Functions } from "node-appwrite";

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

// Test function with a dummy GR id
try {
  const run = await functions.createExecution({
    functionId: "post-stock-opname",
    body: JSON.stringify({ type: "goods_receipt", goods_receipt_id: "test123", created_by: "test" }),
    async: false,
  });
  console.log("statusCode:", run.responseStatusCode);
  console.log("response:", run.responseBody?.substring(0, 500));
} catch (e) {
  console.error("Error:", e.message);
}
