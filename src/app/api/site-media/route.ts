import { NextResponse } from "next/server";
import { getSiteMedia } from "@/lib/site-media/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, media: await getSiteMedia() });
}
