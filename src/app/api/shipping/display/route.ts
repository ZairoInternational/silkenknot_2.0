import { NextResponse } from "next/server";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { loadPolicy } from "@/lib/shipping/booking";
import { DEFAULT_SHIPPING_DISPLAY, shippingDisplayFromPolicy } from "@/lib/shipping/display";
import { policyFromEnv } from "@/lib/shipping/policy";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=120";

export async function GET() {
  try {
    const policy = databaseConfigured()
      ? await loadPolicy(await getDb())
      : policyFromEnv(process.env);
    return NextResponse.json(
      { ok: true, shipping: shippingDisplayFromPolicy(policy) },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    );
  } catch {
    return NextResponse.json(
      { ok: true, shipping: DEFAULT_SHIPPING_DISPLAY },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    );
  }
}
