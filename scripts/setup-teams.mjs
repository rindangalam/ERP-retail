import { readFileSync } from "node:fs";
import { Client, Teams } from "node-appwrite";

const ROLES = ["admin", "warehouse", "purchasing", "sales", "finance", "hr"];

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
  console.error("Env tidak lengkap. Cek .env.local (NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY).");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const teams = new Teams(client);

async function main() {
  const existing = await teams.list();
  const existingNames = new Set(existing.teams.map((t) => t.name));

  for (const role of ROLES) {
    if (existingNames.has(role)) {
      console.log(`[skip] team "${role}" sudah ada`);
      continue;
    }
    const team = await teams.create(role, role);
    console.log(`[ok] team "${role}" dibuat (${team.$id})`);
  }
}

main().catch((e) => {
  console.error("Gagal membuat team:", e.message);
  process.exit(1);
});
