import { cookies } from "next/headers";
import { csrfHeaderMatches, jsonError, sameOrigin } from "@/lib/auth/http";
import { DOCS_COOKIE } from "@/lib/docs/access";
import { ensureCsrfCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Request blocked.", 403);
  await ensureCsrfCookie();
  if (!csrfHeaderMatches(request)) return jsonError("Request blocked.", 403);
  const jar = await cookies();
  jar.delete(DOCS_COOKIE);
  return Response.json({ ok: true });
}
