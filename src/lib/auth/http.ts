import { CSRF_COOKIE } from "@/lib/auth/config";

function hostName(value: string) {
  return value.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase();
}

function localDevHost(value: string) {
  const name = hostName(value);
  return name === "localhost" || name === "127.0.0.1" || name === "::1";
}

export function sameOrigin(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "none") return true;
  const origin = request.headers.get("origin");
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
  if (!origin || !host) return false;
  try {
    const sent = new URL(origin).host;
    if (sent === host) return true;
    return process.env.NODE_ENV !== "production" && localDevHost(sent) && localDevHost(host);
  } catch {
    return false;
  }
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] || request.headers.get("x-real-ip") || "local").trim();
}

export function csrfHeaderMatches(request: Request) {
  const header = request.headers.get("x-silkknot-csrf") || "";
  const cookie = request.headers.get("cookie") || "";
  const row = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${CSRF_COOKIE}=`));
  const token = row ? decodeURIComponent(row.slice(CSRF_COOKIE.length + 1)) : "";
  if (!header || !token || header.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < header.length; i += 1) diff |= header.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...extra }, { status });
}
