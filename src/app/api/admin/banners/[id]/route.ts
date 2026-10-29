import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { isBannerStatus, type BannerStatus } from "@/lib/banners/content";
import {
  assertBannerId,
  deleteBanner,
  getBannerById,
  setBannerStatus,
  updateBanner,
} from "@/lib/banners/server";
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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  try {
    assertBannerId(id);
  } catch {
    return NextResponse.json({ error: "Invalid banner id." }, { status: 400 });
  }

  const banner = await getBannerById(id);
  if (!banner) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, banner });
}

export async function PUT(request: Request, context: RouteContext) {
  if (!sameOrigin(request) || !csrfHeaderMatches(request)) {
    return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  }
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  try {
    assertBannerId(id);
  } catch {
    return NextResponse.json({ error: "Invalid banner id." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  // Status transitions: { action: "publish" | "unpublish" | "schedule" | "archive", ... }
  const action = typeof body.action === "string" ? body.action : "";
  if (action) {
    const map: Record<string, BannerStatus> = {
      publish: "published",
      unpublish: "draft",
      schedule: "scheduled",
      archive: "archived",
    };
    const next = map[action];
    if (!next || !isBannerStatus(next)) {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    try {
      const banner = await setBannerStatus(id, next, gate.session.id, {
        startsAt: body.startsAt,
        endsAt: body.endsAt,
      });
      if (!banner) return NextResponse.json({ error: "Not found." }, { status: 404 });
      revalidatePath("/");
      revalidatePath("/shop");
      return NextResponse.json({
        ok: true,
        banner,
        message:
          action === "publish"
            ? "Banner published."
            : action === "schedule"
              ? "Banner scheduled."
              : action === "archive"
                ? "Banner archived."
                : "Banner unpublished.",
      });
    } catch (error) {
      const status = (error as { status?: number }).status || 503;
      const message = error instanceof Error ? error.message : "Could not update status.";
      const field = (error as { field?: string }).field;
      return NextResponse.json({ error: message, ...(field ? { field } : {}) }, { status });
    }
  }

  try {
    const banner = await updateBanner(id, body, gate.session.id);
    if (!banner) return NextResponse.json({ error: "Not found." }, { status: 404 });
    revalidatePath("/");
    revalidatePath("/shop");
    return NextResponse.json({ ok: true, banner, message: "Banner saved." });
  } catch (error) {
    const status = (error as { status?: number }).status || 503;
    const message = error instanceof Error ? error.message : "Could not save the banner.";
    const field = (error as { field?: string }).field;
    return NextResponse.json({ error: message, ...(field ? { field } : {}) }, { status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!sameOrigin(request) || !csrfHeaderMatches(request)) {
    return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  }
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  try {
    assertBannerId(id);
  } catch {
    return NextResponse.json({ error: "Invalid banner id." }, { status: 400 });
  }

  let body: { confirm?: unknown } = {};
  try {
    body = (await request.json()) as { confirm?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request. Send { confirm: true }." }, { status: 400 });
  }

  try {
    const result = await deleteBanner(id, body.confirm === true);
    if (!result) return NextResponse.json({ error: "Not found." }, { status: 404 });
    revalidatePath("/");
    revalidatePath("/shop");
    return NextResponse.json({ ok: true, message: "Banner deleted.", id: result.id });
  } catch (error) {
    const status = (error as { status?: number }).status || 503;
    const message = error instanceof Error ? error.message : "Could not delete the banner.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
