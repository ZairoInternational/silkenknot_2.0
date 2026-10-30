import { NextResponse } from "next/server";
import { getPublicAnnouncements } from "@/lib/announcements/server";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=120";

export async function GET() {
  const notes = await getPublicAnnouncements();
  return NextResponse.json({ ok: true, notes }, { headers: { "Cache-Control": CACHE_CONTROL } });
}
