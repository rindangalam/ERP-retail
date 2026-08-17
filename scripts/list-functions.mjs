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

const f = new Functions(client);
const list = await f.list();
console.log("Functions:", list.total);
for (const fn of list.functions) {
  console.log(fn.$id, fn.name, fn.runtime);
}
