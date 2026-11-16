import { NextResponse } from "next/server";
import { databaseConfigured, getDb } from "@/lib/mongo";
import {
  hasPriorStoreOrder,
  loadPlatformFeePolicy,
  platformFeeFromEnv,
} from "@/lib/payments/platformFee";
import {
  DEFAULT_PLATFORM_FEE_DISPLAY,
  platformFeeDisplayFromPolicy,
} from "@/lib/payments/platformFeeDisplay";
import { currentSession } from "@/lib/session";

export const runtime = "nodejs";

const CACHE_CONTROL = "private, max-age=30";

export async function GET() {
  try {
    if (!databaseConfigured()) {
      return NextResponse.json(
        { ok: true, platformFee: platformFeeDisplayFromPolicy(platformFeeFromEnv(), true) },
        { headers: { "Cache-Control": CACHE_CONTROL } },
      );
    }
    const db = await getDb();
    const session = await currentSession();
    const policy = await loadPlatformFeePolicy(db);
    const isFirstOrder = session?.role === "customer"
      ? !(await hasPriorStoreOrder(db, session.id))
      : true;
    return NextResponse.json(
      { ok: true, platformFee: platformFeeDisplayFromPolicy(policy, isFirstOrder) },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    );
  } catch {
    return NextResponse.json(
      { ok: true, platformFee: DEFAULT_PLATFORM_FEE_DISPLAY },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    );
  }
}
