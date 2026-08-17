import "server-only";
import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";

export type SessionPayload = {
  userId: string;
  role: string;
  name: string;
  sessionSecret?: string;
};

export const SESSION_COOKIE = "erp_session";
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 jam

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET belum diisi di .env.local.");
  }
  return new Uint8Array(Buffer.from(secret, "hex"));
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .encrypt(getSecretKey());
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtDecrypt(token, getSecretKey(), {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    });
    if (typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      role: typeof payload.role === "string" ? payload.role : "",
      name: typeof payload.name === "string" ? payload.name : "",
      sessionSecret: typeof payload.sessionSecret === "string" ? payload.sessionSecret : undefined,
    };
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const token = await encrypt(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? decrypt(token) : null;
}

export async function deleteSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
