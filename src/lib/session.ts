import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { CSRF_COOKIE, SESSION_COOKIE, authSecret, otpConfig } from "@/lib/auth/config";
import { databaseConfigured, getDb } from "@/lib/mongo";

export type SessionRole = "customer" | "admin";

type SessionDoc = {
  id: string;
  userId: string;
  role: SessionRole;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  absoluteExpiresAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function cookieBase() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function createSession(userId: string, role: SessionRole) {
  const config = otpConfig();
  const jar = await cookies();
  const previous = jar.get(SESSION_COOKIE)?.value;
  const db = await getDb();
  const sessions = db.collection<SessionDoc>("sessions");
  if (previous) await sessions.updateOne({ tokenHash: hashToken(previous), revokedAt: null }, { $set: { revokedAt: new Date().toISOString() } });
  const token = randomBytes(32).toString("base64url");
  const csrf = randomBytes(32).toString("base64url");
  const now = new Date();
  const absolute = new Date(now.getTime() + config.absoluteSeconds * 1000);
  const idle = new Date(now.getTime() + config.idleSeconds * 1000);
  await sessions.insertOne({
    id: randomBytes(16).toString("hex"),
    userId,
    role,
    tokenHash: hashToken(token),
    createdAt: now.toISOString(),
    expiresAt: idle.toISOString(),
    absoluteExpiresAt: absolute.toISOString(),
    lastSeenAt: now.toISOString(),
    revokedAt: null,
  });
  jar.set(SESSION_COOKIE, token, { ...cookieBase(), maxAge: config.idleSeconds });
  jar.set(CSRF_COOKIE, csrf, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: config.absoluteSeconds,
  });
  return { userId, role };
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && databaseConfigured()) {
    const db = await getDb();
    await db.collection("sessions").updateOne(
      { tokenHash: hashToken(token), revokedAt: null },
      { $set: { revokedAt: new Date().toISOString() } },
    );
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(CSRF_COOKIE);
}

export async function currentSession() {
  if (!databaseConfigured()) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    authSecret();
  } catch {
    return null;
  }
  const db = await getDb();
  const sessions = db.collection<SessionDoc>("sessions");
  const row = await sessions.findOne({ tokenHash: hashToken(token) });
  const now = Date.now();
  if (!row || row.revokedAt) return null;
  if (new Date(row.absoluteExpiresAt).getTime() <= now || new Date(row.expiresAt).getTime() <= now) return null;
  const config = otpConfig();
  if (now - new Date(row.lastSeenAt).getTime() > 5 * 60 * 1000) {
    const idle = new Date(Math.min(now + config.idleSeconds * 1000, new Date(row.absoluteExpiresAt).getTime()));
    await sessions.updateOne({ id: row.id, revokedAt: null }, { $set: { lastSeenAt: new Date(now).toISOString(), expiresAt: idle.toISOString() } });
  }
  return { id: row.userId, role: row.role, sessionId: row.id };
}

export async function setSession(payload: { id: string; role: SessionRole }) {
  if (payload.role === "admin") await createSession(payload.id, "admin");
  else await createSession(payload.id, "customer");
}

export async function ensureCsrfCookie() {
  const jar = await cookies();
  if (jar.get(CSRF_COOKIE)?.value) return;
  jar.set(CSRF_COOKIE, randomBytes(32).toString("base64url"), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: otpConfig().absoluteSeconds,
  });
}
