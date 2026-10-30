import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { getBrandSettings, saveBrandSettings } from "@/lib/brand/server";
import { CACHE_TAGS } from "@/lib/cache/tags";
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
  return NextResponse.json({ ok: true, brand: await getBrandSettings() });
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

  let body: { brand?: unknown };
  try {
    body = (await request.json()) as { brand?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  try {
    const brand = await saveBrandSettings(body.brand);
    revalidateTag(CACHE_TAGS.brand, "max");
    revalidatePath("/", "layout");
    revalidatePath("/admin/brand");
    return NextResponse.json({ ok: true, brand, message: "Brand icon saved." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the brand icon.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
