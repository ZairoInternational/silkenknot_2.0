import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { databaseConfigured, getDb } from "@/lib/mongo";
import {
  loadPlatformFeePolicy,
  publicPlatformFeePolicy,
  type PlatformFeeOverrides,
} from "@/lib/payments/platformFee";
import { currentSession } from "@/lib/session";

export const runtime = "nodejs";

async function adminDb(request: Request, write: boolean) {
  if (!sameOrigin(request) || (write && !csrfHeaderMatches(request))) {
    return { error: NextResponse.json({ error: "Request blocked." }, { status: 403 }) };
  }
  if (!databaseConfigured()) return { error: NextResponse.json({ error: "Unavailable." }, { status: 503 }) };
  const session = await currentSession();
  if (!session || session.role !== "admin") return { error: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  return { db: await getDb() };
}

export async function GET(request: Request) {
  const gate = await adminDb(request, false);
  if ("error" in gate && gate.error) return gate.error;
  const policy = await loadPlatformFeePolicy(gate.db!);
  return NextResponse.json({ policy: publicPlatformFeePolicy(policy) });
}

export async function POST(request: Request) {
  const gate = await adminDb(request, true);
  if ("error" in gate && gate.error) return gate.error;
  const db = gate.db!;
  const body = await request.json();
  if (String(body.action || "") !== "save-settings") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  const overrides: PlatformFeeOverrides = {
    enabled: body.enabled === true,
    feePaise: Number(body.feePaise),
    waiveAbovePaise: Number(body.waiveAbovePaise),
    waiveFirstOrder: body.waiveFirstOrder === true,
  };
  if (!Number.isInteger(overrides.feePaise) || (overrides.feePaise ?? 0) < 0) {
    return NextResponse.json({ error: "Platform fee must be a whole number of paise." }, { status: 400 });
  }
  if (!Number.isInteger(overrides.waiveAbovePaise) || (overrides.waiveAbovePaise ?? 0) < 0) {
    return NextResponse.json({ error: "Order value waiver must be a whole number of paise." }, { status: 400 });
  }
  await db.collection("storeSettings").updateOne(
    { id: "platformFee" },
    { $set: { id: "platformFee", overrides, updatedAt: new Date().toISOString() } },
    { upsert: true },
  );
  return NextResponse.json({ policy: publicPlatformFeePolicy(await loadPlatformFeePolicy(db)) });
}
