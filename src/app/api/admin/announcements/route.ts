import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAnnouncementSettings, saveAnnouncementSettings } from "@/lib/announcements/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
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
  return NextResponse.json({ ok: true, announcements: await getAnnouncementSettings() });
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

  let body: { announcements?: unknown };
  try {
    body = (await request.json()) as { announcements?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  try {
    const announcements = await saveAnnouncementSettings(body.announcements);
    revalidatePath("/");
    return NextResponse.json({ ok: true, announcements, message: "Announcements saved." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save announcements.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
