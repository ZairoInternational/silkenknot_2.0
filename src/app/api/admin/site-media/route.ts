import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { databaseConfigured } from "@/lib/mongo";
import { currentSession } from "@/lib/session";
import { getSiteMedia, saveSiteMedia } from "@/lib/site-media/server";

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
  return NextResponse.json({ ok: true, media: await getSiteMedia() });
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

  let body: { media?: unknown };
  try {
    body = (await request.json()) as { media?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  try {
    const media = await saveSiteMedia(body.media);
    revalidateTag(CACHE_TAGS.siteMedia, "max");
    revalidatePath("/", "layout");
    revalidatePath("/shop");
    revalidatePath("/wishlist");
    revalidatePath("/checkout");
    revalidatePath("/account");
    return NextResponse.json({ ok: true, media, message: "Site images saved." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save site images.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
