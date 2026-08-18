import { readFileSync } from "node:fs";
import { Client, Databases, ID, Query } from "node-appwrite";

const raw = readFileSync(".env.local", "utf8");
const get = (name) => raw.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]?.trim();

const client = new Client()
  .setEndpoint(get("NEXT_PUBLIC_APPWRITE_ENDPOINT"))
  .setProject(get("NEXT_PUBLIC_APPWRITE_PROJECT_ID"))
  .setKey(get("APPWRITE_API_KEY"));

const db = new Databases(client);
const DATABASE_ID = "erp";

const accounts = [
  { code: "1120", name: "Piutang Usaha", account_type: "asset" },
  { code: "4100", name: "Pendapatan Penjualan", account_type: "revenue" },
];

const existing = await db.listDocuments(DATABASE_ID, "chart_of_accounts", [
  Query.equal("is_active", [true]),
]);
const coa_map = new Map(existing.documents.map((a) => [a.code, a]));

const now = new Date().toISOString();
for (const acct of accounts) {
  if (coa_map.has(acct.code)) {
    console.log(`[skip] ${acct.code} ${acct.name} sudah ada`);
    continue;
  }
  await db.createDocument({
    databaseId: DATABASE_ID,
    collectionId: "chart_of_accounts",
    documentId: ID.unique(),
    data: {
      code: acct.code,
      name: acct.name,
      account_type: acct.account_type,
      parent_account_id: null,
      is_active: true,
      created_by: "system",
      created_at: now,
    },
  });
  console.log(`[ok] ${acct.code} ${acct.name} dibuat`);
}

console.log("Selesai seed COA.");
