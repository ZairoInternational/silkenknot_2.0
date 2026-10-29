import { NextResponse } from "next/server";
import { isBannerPlacement, type BannerPlacement } from "@/lib/banners/content";
import { listPublicBanners } from "@/lib/banners/server";
import { databaseConfigured } from "@/lib/mongo";

export const runtime = "nodejs";
/** Eligibility is time-sensitive — avoid long-lived shared caches of expired campaigns. */
export const dynamic = "force-dynamic";

function cacheControlForBanners(banners: { endsAt: string }[]) {
  if (!banners.length) {
    // Empty result can change when a scheduled campaign starts — short private cache only.
    return "private, no-store";
  }
  const now = Date.now();
  let soonestEnd = Number.POSITIVE_INFINITY;
  for (const banner of banners) {
    const end = Date.parse(banner.endsAt);
    if (!Number.isNaN(end) && end > now) soonestEnd = Math.min(soonestEnd, end);
  }
  if (!Number.isFinite(soonestEnd)) return "private, no-store";
  const seconds = Math.max(1, Math.min(60, Math.floor((soonestEnd - now) / 1000)));
  return `private, max-age=0, s-maxage=${seconds}, must-revalidate`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const placementRaw = url.searchParams.get("placement") || "";
  if (!isBannerPlacement(placementRaw)) {
    return NextResponse.json(
      { error: "Provide a valid placement (homepage-hero, promotional-strip)." },
      { status: 400 },
    );
  }
  const placement = placementRaw as BannerPlacement;

  if (!databaseConfigured()) {
    return NextResponse.json(
      { ok: true, banners: [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const banners = await listPublicBanners({
      placement,
      limit: Number(url.searchParams.get("limit") || 10),
    });
    return NextResponse.json(
      { ok: true, banners },
      { headers: { "Cache-Control": cacheControlForBanners(banners) } },
    );
  } catch (error) {
    console.warn("[banners] public list failed", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ ok: true, banners: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
