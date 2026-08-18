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
  // Asset
  { code: "1110", name: "Kas", account_type: "asset" },
  { code: "1120", name: "Piutang Usaha", account_type: "asset" },
  { code: "1210", name: "Persediaan Barang", account_type: "asset" },
  // Liability
  { code: "2110", name: "Hutang Usaha", account_type: "liability" },
  // Revenue
  { code: "4100", name: "Pendapatan Penjualan", account_type: "revenue" },
  { code: "4200", name: "Pendapatan Lain-lain", account_type: "revenue" },
  // Expense
  { code: "5100", name: "Beban Gaji", account_type: "expense" },
  { code: "5200", name: "Beban Sewa", account_type: "expense" },
  { code: "5300", name: "Beban Listrik & Air", account_type: "expense" },
  { code: "5900", name: "Beban Lain-lain", account_type: "expense" },
];

const existing = await db.listDocuments(DATABASE_ID, "chart_of_accounts", [
  Query.limit(100),
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
