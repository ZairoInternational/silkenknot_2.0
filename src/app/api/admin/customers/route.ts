import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { databaseConfigured, getDb, publicUser } from "@/lib/mongo";
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

export async function POST(request: Request) {
  const gate = await adminDb(request, true);
  if ("error" in gate && gate.error) return gate.error;
  const db = gate.db!;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Request could not be read." }, { status: 400 });
  if (String(body.action || "") !== "set-blocked") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  const userId = String(body.userId || "").trim();
  if (!userId) return NextResponse.json({ error: "Customer required." }, { status: 400 });
  const blocked = body.blocked === true;
  const customer = await db.collection("users").findOneAndUpdate(
    { id: userId, role: "customer" },
    { $set: { blocked } },
    { returnDocument: "after" },
  );
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  if (blocked) {
    await db.collection("sessions").updateMany(
      { userId, role: "customer", revokedAt: null },
      { $set: { revokedAt: new Date().toISOString() } },
    );
  }
  return NextResponse.json({ ok: true, user: publicUser(customer as { [key: string]: unknown }) });
}
