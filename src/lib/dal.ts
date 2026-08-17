import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

export const getCurrentSession = cache(async (): Promise<SessionPayload | null> => {
  return getSession();
});

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getCurrentSession();
  if (!session?.userId) redirect("/login");
  return session;
}

export async function requireRole(roles: string[]): Promise<SessionPayload> {
  const session = await requireAuth();
  if (!roles.includes(session.role)) redirect("/dashboard");
  return session;
}
