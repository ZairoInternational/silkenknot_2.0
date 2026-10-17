import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { publicOrder, type StoredOrder } from "@/lib/payments/service";
import { refreshTracking } from "@/lib/shipping/booking";
import { DelhiveryError } from "@/lib/shipping/delhivery";
import { currentSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request) || !csrfHeaderMatches(request)) return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  if (!databaseConfigured()) return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Log in to continue." }, { status: 401 });
  const body = await request.json();
  const db = await getDb();
  const query = session.role === "admin" ? { id: String(body.orderId || "") } : { id: String(body.orderId || ""), userId: session.id };
  const order = await db.collection<StoredOrder>("orders").findOne(query);
  if (!order?.shipment?.awb) return NextResponse.json({ error: "Tracking is not available yet." }, { status: 404 });
  const last = order.shipment.lastTrackingAt ? new Date(order.shipment.lastTrackingAt).getTime() : 0;
  if (!order.shipment.test && Date.now() - last < 30_000) return NextResponse.json({ order: publicOrder(order), cached: true });
  try {
    const saved = await refreshTracking(db, order.id);
    return NextResponse.json({ order: saved ? publicOrder(saved as unknown as StoredOrder) : publicOrder(order) });
  } catch (error) {
    if (error instanceof DelhiveryError) return NextResponse.json({ error: "Tracking could not be refreshed. The last known status is unchanged.", order: publicOrder(order) }, { status: 503 });
    return NextResponse.json({ error: "Tracking could not be refreshed." }, { status: 503 });
  }
}
