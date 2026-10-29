import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { createBanner, listBanners, reorderBanners } from "@/lib/banners/server";
import { isBannerPlacement } from "@/lib/banners/content";
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

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  try {
    const result = await listBanners({
      placement: url.searchParams.get("placement") || undefined,
      status: url.searchParams.get("status") || undefined,
      page: Number(url.searchParams.get("page") || 1),
      pageSize: Number(url.searchParams.get("pageSize") || 20),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list banners.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || !csrfHeaderMatches(request)) {
    return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  }
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  // Reorder action on the collection endpoint
  if (body.action === "reorder") {
    const placement = body.placement;
    const orderedIds = body.orderedIds;
    if (!isBannerPlacement(placement) || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "Provide placement and orderedIds." }, { status: 400 });
    }
    try {
      const result = await reorderBanners(placement, orderedIds.map(String), gate.session.id);
      return NextResponse.json({ ok: true, ...result, message: "Order saved." });
    } catch (error) {
      const status = (error as { status?: number }).status || 503;
      const message = error instanceof Error ? error.message : "Could not reorder.";
      return NextResponse.json({ error: message }, { status });
    }
  }

  try {
    const banner = await createBanner(body, gate.session.id);
    return NextResponse.json({ ok: true, banner, message: "Draft created." }, { status: 201 });
  } catch (error) {
    const status = (error as { status?: number }).status || 503;
    const message = error instanceof Error ? error.message : "Could not create the banner.";
    const field = (error as { field?: string }).field;
    return NextResponse.json({ error: message, ...(field ? { field } : {}) }, { status });
  }
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
