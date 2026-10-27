import { NextResponse } from "next/server";
import { getPublicAnnouncements } from "@/lib/announcements/server";

export const runtime = "nodejs";

export async function GET() {
  const notes = await getPublicAnnouncements();
  return NextResponse.json({ ok: true, notes });
}
