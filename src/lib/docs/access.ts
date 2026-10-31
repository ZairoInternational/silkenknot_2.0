/** Docs gate: shared password → signed httpOnly cookie. Not tied to shop/admin sessions. */

export const DOCS_COOKIE = "silkknot_docs";
export const DOCS_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function encoder() {
  return new TextEncoder();
}

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i += 1) s += String.fromCharCode(u8[i]!);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlToBytes(value: string) {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function docsAccessSecret() {
  return process.env.DOCS_ACCESS_SECRET?.trim() || "";
}

export function docsPublicOverride() {
  return process.env.DOCS_PUBLIC === "1";
}

/** Local DX: no secret configured → docs stay open. Production always needs secret or DOCS_PUBLIC. */
export function docsGateOpenWithoutAuth() {
  if (docsPublicOverride()) return true;
  if (process.env.NODE_ENV !== "production" && !docsAccessSecret()) return true;
  return false;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function signPayload(secret: string, payload: string) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder().encode(payload));
  return b64url(sig);
}

export async function mintDocsCookieValue(secret: string, now = Date.now()) {
  const exp = Math.floor(now / 1000) + DOCS_TTL_SECONDS;
  const payload = `v1|${exp}`;
  const sig = await signPayload(secret, payload);
  return `v1.${exp}.${sig}`;
}

export async function verifyDocsCookieValue(token: string | undefined, secret: string, now = Date.now()) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp * 1000 <= now) return false;
  const payload = `v1|${exp}`;
  const expected = await signPayload(secret, payload);
  const a = b64urlToBytes(expected);
  const b = b64urlToBytes(parts[2] || "");
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function passwordMatches(secret: string, password: string) {
  if (!secret || !password || secret.length !== password.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i += 1) diff |= secret.charCodeAt(i) ^ password.charCodeAt(i);
  return diff === 0;
}

export function docsCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DOCS_TTL_SECONDS,
  };
}

export function isProtectedDocsPath(pathname: string) {
  return (
    pathname === "/docs/api" ||
    pathname.startsWith("/docs/api/") ||
    pathname === "/docs/api.html" ||
    pathname === "/openapi.yaml" ||
    pathname === "/openapi.json" ||
    pathname === "/api/openapi"
  );
}

export function isDocsHtmlPath(pathname: string) {
  return pathname === "/docs/api" || pathname.startsWith("/docs/api/") || pathname === "/docs/api.html";
}
