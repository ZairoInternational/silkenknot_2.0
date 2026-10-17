import { jsonError, sameOrigin } from "@/lib/auth/http";
import { clearSession } from "@/lib/session";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Request blocked.", 403);
  await clearSession();
  return Response.json({ ok: true });
}
