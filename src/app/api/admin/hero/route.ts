import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { getHeroContent, saveHeroContent } from "@/lib/hero/server";
import { databaseConfigured } from "@/lib/mongo";
import { currentSession } from "@/lib/session";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await currentSession();
  if (!session || session.role !== "admin") {
    return { error: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  }
  return { session };
}

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const content = await getHeroContent();
  return NextResponse.json({ ok: true, content, offer: content.offer, evergreen: content.evergreen });
}

export async function PUT(request: Request) {
  if (!sameOrigin(request) || !csrfHeaderMatches(request)) {
    return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  }
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  let body: { content?: unknown; offer?: unknown; evergreen?: unknown };
  try {
    body = (await request.json()) as { content?: unknown; offer?: unknown; evergreen?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  try {
    const payload = body.content ?? { offer: body.offer, evergreen: body.evergreen };
    const content = await saveHeroContent(payload);
    revalidateTag(CACHE_TAGS.hero, "max");
    revalidatePath("/");
    return NextResponse.json({
      ok: true,
      content,
      offer: content.offer,
      evergreen: content.evergreen,
      message: "Hero saved.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the hero.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
