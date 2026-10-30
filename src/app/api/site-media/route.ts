import { NextResponse } from "next/server";
import { getSiteMedia } from "@/lib/site-media/server";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=120";

export async function GET() {
  return NextResponse.json(
    { ok: true, media: await getSiteMedia() },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
