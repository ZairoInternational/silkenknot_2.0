import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "silkknot_session";

function secret() {
  return process.env.AUTH_SECRET || "silkknot-dev-session";
}

export function signSession(payload: { id: string; role: "customer" | "admin" }) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readSession(token?: string) {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as { id: string; role: "customer" | "admin"; exp: number };
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

export async function setSession(payload: { id: string; role: "customer" | "admin" }) {
  const jar = await cookies();
  jar.set(COOKIE, signSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function currentSession() {
  const jar = await cookies();
  return readSession(jar.get(COOKIE)?.value);
}
