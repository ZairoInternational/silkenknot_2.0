import { NextResponse } from "next/server";
import { getBrandSettings } from "@/lib/brand/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, brand: await getBrandSettings() });
}
