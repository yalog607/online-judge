import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export type Role = "User" | "Teacher" | "Admin";

export type SessionPayload = {
  sessionId: string;
  actorId?: number;
};

const COOKIE = "itoj_session";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function key() {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

async function encrypt(payload: SessionPayload, expiresAt: Date) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(key());
}

async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + TTL_MS);
  const token = await encrypt(payload, expiresAt);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return decrypt(token);
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export function sessionCookieName() {
  return COOKIE;
}
