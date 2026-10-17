import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { publicOrder, type StoredOrder } from "@/lib/payments/service";
import { cancelShipment, loadPolicy } from "@/lib/shipping/booking";
import { DelhiveryError } from "@/lib/shipping/delhivery";
import { canCancelShipment, canRequestReturn } from "@/lib/shipping/states";
import { currentSession } from "@/lib/session";
import type { ShipmentRecord } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request) || !csrfHeaderMatches(request)) return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  if (!databaseConfigured()) return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  const session = await currentSession();
  if (!session || session.role !== "customer") return NextResponse.json({ error: "Log in to continue." }, { status: 401 });
  const body = await request.json();
  const db = await getDb();
  const order = await db.collection<StoredOrder>("orders").findOne({ id: String(body.orderId || ""), userId: session.id });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const shipment = order.shipment as ShipmentRecord | undefined;
  const state = shipment?.state || "not_created";
  const deliveredAt = shipment?.events.find((event) => event.state === "delivered")?.at;
  try {
    if (body.intent === "return") {
      const policy = await loadPolicy(db);
      if (!canRequestReturn(state, deliveredAt, new Date().toISOString(), policy.returnWindowDays)) {
        return NextResponse.json({ error: "This order is outside the return window." }, { status: 409 });
      }
      await db.collection("orders").updateOne({ id: order.id }, { $set: { status: "return_requested" }, $push: { audit: { at: new Date().toISOString(), event: "return_requested" } } } as never);
      return NextResponse.json({ order: publicOrder({ ...order, status: "return_requested" }) });
    }
    if (!canCancelShipment(state)) return NextResponse.json({ error: "This shipment can no longer be cancelled." }, { status: 409 });
    if (shipment?.awb) await cancelShipment(db, order.id);
    else await db.collection("orders").updateOne({ id: order.id }, { $set: { "shipment.state": "cancelled", status: order.paymentState === "captured" ? order.status : "cancelled" } });
    const saved = await db.collection<StoredOrder>("orders").findOne({ id: order.id });
    return NextResponse.json({ order: saved ? publicOrder(saved) : null, refunded: false });
  } catch (error) {
    if (error instanceof DelhiveryError) return NextResponse.json({ error: "This order could not be cancelled." }, { status: 409 });
    return NextResponse.json({ error: "The cancellation could not be completed." }, { status: 503 });
  }
}
