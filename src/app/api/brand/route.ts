import { NextResponse } from "next/server";
import { getBrandSettings } from "@/lib/brand/server";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=120";

export async function GET() {
  return NextResponse.json(
    { ok: true, brand: await getBrandSettings() },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
