"use server";

import { redirect } from "next/navigation";
import { Account, Client, Query } from "node-appwrite";
import { adminDatabases, appwriteEndpoint, appwriteProjectId } from "@/lib/appwrite-server";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

export async function loginAction(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  let sessionInfo: {
    userId: string;
    role: string;
    name: string;
    sessionSecret?: string;
  } | null = null;

  try {
    // Buat session Appwrite pakai kredensial user itu sendiri (tanpa API key).
    const userClient = new Client()
      .setEndpoint(appwriteEndpoint)
      .setProject(appwriteProjectId);
    const account = new Account(userClient);
    const appSession = await account.createEmailPasswordSession({ email, password });

    const profiles = await adminDatabases().listDocuments("erp", "user_profiles", [
      Query.equal("user_id", [appSession.userId]),
    ]);

    if (profiles.total === 0) {
      throw new Error("Akun tidak memiliki profil ERP.");
    }

    const profile = profiles.documents[0] as unknown as {
      full_name?: string;
      role?: string;
      is_active?: boolean;
    };

    if (profile.is_active === false) {
      throw new Error("Akun dinonaktifkan.");
    }

    sessionInfo = {
      userId: appSession.userId,
      role: profile.role ?? "",
      name: profile.full_name ?? email,
      sessionSecret: appSession.secret,
    };
  } catch {
    return { error: "Email atau password salah, atau akun belum memiliki profil ERP." };
  }

  await createSession(sessionInfo);
  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
