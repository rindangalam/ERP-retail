import { readFileSync } from "node:fs";
import {
  Client,
  Databases,
  ID,
  Permission,
  Query,
  Role,
  Teams,
  Users,
} from "node-appwrite";

const DATABASE_ID = "erp";
const PROFILE_COLLECTION_ID = "user_profiles";

const TEST_PASSWORD = process.env.SEED_PASSWORD ?? "ChangeMe#2026";

const TEST_USERS = [
  { role: "admin", name: "Admin Utama" },
  { role: "warehouse", name: "Staff Gudang" },
  { role: "purchasing", name: "Staff Purchasing" },
  { role: "sales", name: "Staff Sales" },
  { role: "finance", name: "Staff Finance" },
  { role: "hr", name: "Staff HR" },
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
const users = new Users(client);
const teams = new Teams(client);
const databases = new Databases(client);

const now = new Date().toISOString();

async function ensureUser(user) {
  const userId = user.role;
  let existing = null;
  try {
    existing = await users.get(userId);
  } catch {
    /* not found */
  }

  if (existing) {
    console.log(`[skip] user "${userId}" sudah ada`);
    return existing;
  }

  const created = await users.create({
    userId,
    email: `${userId}@erp.local`,
    password: TEST_PASSWORD,
    name: user.name,
  });
  console.log(`[ok] user "${userId}" dibuat`);
  return created;
}

async function assignLabel(userId, label) {
  await users.updateLabels({ userId, labels: [label] });
  console.log(`[ok] label "${label}" dipasang ke user "${userId}"`);
}

async function addToTeam(userId, teamId, role) {
  const memberships = await teams.listMemberships(teamId, [], 100);
  if (memberships.memberships.some((m) => m.userId === userId)) {
    console.log(`[skip] user "${userId}" sudah anggota team "${teamId}"`);
    return;
  }
  await teams.createMembership({ teamId, roles: [role], userId });
  console.log(`[ok] user "${userId}" ditambahkan ke team "${teamId}"`);
}

async function ensureProfile(user) {
  const userId = user.role;
  const existing = await databases.listDocuments(DATABASE_ID, PROFILE_COLLECTION_ID, [
    Query.equal("user_id", [userId]),
  ]);

  if (existing.total > 0) {
    console.log(`[skip] profil "${userId}" sudah ada`);
    return;
  }

  await databases.createDocument({
    databaseId: DATABASE_ID,
    collectionId: PROFILE_COLLECTION_ID,
    documentId: ID.unique(),
    data: {
      user_id: userId,
      full_name: user.name,
      role: user.role,
      team_ids: [user.role],
      is_active: true,
      created_by: userId,
      created_at: now,
    },
    permissions: [
      Permission.read(Role.user(userId)),
      Permission.read(Role.label("admin")),
      Permission.write(Role.label("admin")),
    ],
  });
  console.log(`[ok] profil "${userId}" dibuat`);
}

async function main() {
  for (const user of TEST_USERS) {
    const appUser = await ensureUser(user);
    await assignLabel(appUser.$id, user.role);
    await addToTeam(appUser.$id, user.role, user.role);
    await ensureProfile(user);
  }

  console.log("\nSelesai. Kredensial test (dev):");
  console.log(`  Password default: ${TEST_PASSWORD}`);
  TEST_USERS.forEach((u) => console.log(`  ${u.role} → ${u.role}@erp.local`));
  console.log("\nGANTI password test user sebelum go-live (Sprint 9).");
}

main().catch((e) => {
  console.error("Gagal setup users:", e.message);
  process.exit(1);
});
