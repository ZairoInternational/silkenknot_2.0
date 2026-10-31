import { cookies } from "next/headers";
import { clientIp, csrfHeaderMatches, jsonError, sameOrigin } from "@/lib/auth/http";
import {
  DOCS_COOKIE,
  docsAccessSecret,
  docsCookieOptions,
  docsPublicOverride,
  mintDocsCookieValue,
  passwordMatches,
} from "@/lib/docs/access";
import { ensureCsrfCookie } from "@/lib/session";

export const runtime = "nodejs";

const hits = new Map<string, number[]>();

function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((at) => now - at < 15 * 60 * 1000);
  if (recent.length >= 10) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

/** Seed CSRF cookie before the password form posts. */
export async function GET() {
  await ensureCsrfCookie();
  return Response.json({
    ok: true,
    public: docsPublicOverride(),
    configured: Boolean(docsAccessSecret()) || docsPublicOverride() || process.env.NODE_ENV !== "production",
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Request blocked.", 403);
  await ensureCsrfCookie();
  if (!csrfHeaderMatches(request)) return jsonError("Request blocked.", 403);
  if (!allowed(clientIp(request))) return jsonError("Too many attempts. Try again later.", 429);

  if (docsPublicOverride()) {
    return Response.json({ ok: true, message: "Docs are already public on this deploy." });
  }

  const secret = docsAccessSecret();
  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      return Response.json({ ok: true, message: "Local docs are open without a password." });
    }
    return jsonError("Docs access is not configured.", 503);
  }

  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!passwordMatches(secret, password)) return jsonError("Incorrect password.", 401);

  const token = await mintDocsCookieValue(secret);
  const jar = await cookies();
  jar.set(DOCS_COOKIE, token, docsCookieOptions());
  return Response.json({ ok: true });
}
