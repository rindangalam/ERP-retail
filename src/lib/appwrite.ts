import { Client, Account, Databases } from "appwrite";

export const appwriteEndpoint = "https://sgp.cloud.appwrite.io/v1";
export const appwriteProjectId = "6a7e8867001efe2dbf70";

const client = new Client()
  .setEndpoint(appwriteEndpoint)
  .setProject(appwriteProjectId);

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };
