import "server-only";
import { Client, Account, Databases } from "node-appwrite";

export const appwriteEndpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://sgp.cloud.appwrite.io/v1";
export const appwriteProjectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "6a7e8867001efe2dbf70";

function getApiKey() {
  const key = process.env.APPWRITE_API_KEY;
  if (!key) {
    throw new Error(
      "APPWRITE_API_KEY belum diisi. Buat API key di Appwrite Dashboard → Project → API Keys, lalu isi .env.local."
    );
  }
  return key;
}

let adminClient: Client | null = null;

export function getAdminClient(): Client {
  if (adminClient) return adminClient;

  const client = new Client()
    .setEndpoint(appwriteEndpoint)
    .setProject(appwriteProjectId)
    .setKey(getApiKey());

  adminClient = client;
  return client;
}

export const adminAccount = () => new Account(getAdminClient());
export const adminDatabases = () => new Databases(getAdminClient());
