import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { paymentLog } from "@/lib/payments/log";
import { safeEqualText } from "@/lib/payments/signature";
import { loadPolicy, refreshTracking } from "@/lib/shipping/booking";
import { waybillFromPush } from "@/lib/shipping/delhivery";
import { applyTracking } from "@/lib/shipping/states";
import type { ShipmentRecord } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const raw = await request.text();
  const db = await getDb();
  const policy = await loadPolicy(db);
  if (!policy.webhookToken) return NextResponse.json({ error: "Delhivery push is not configured. Use tracking refresh." }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Token\s+/i, "") || "";
  if (!safeEqualText(policy.webhookToken, token)) {
    paymentLog("delhivery_webhook_rejected", { reason: "token" });
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }
  const eventId = createHash("sha256").update(raw).digest("hex");
  try {
    await db.collection("delhiveryEvents").insertOne({ eventId, receivedAt: new Date().toISOString(), status: "received" });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return NextResponse.json({ received: true, duplicate: true });
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await db.collection("delhiveryEvents").updateOne({ eventId }, { $set: { status: "ignored" } });
    return NextResponse.json({ received: true, ignored: true });
  }
  const push = waybillFromPush(parsed);
  if (!push) {
    await db.collection("delhiveryEvents").updateOne({ eventId }, { $set: { status: "ignored" } });
    return NextResponse.json({ received: true, ignored: true });
  }
  const order = await db.collection("orders").findOne({ "shipment.awb": push.waybill });
  if (!order || order.shipment?.test) {
    await db.collection("delhiveryEvents").updateOne({ eventId }, { $set: { status: order?.shipment?.test ? "ignored" : "unmatched", waybill: push.waybill } });
    return NextResponse.json({ received: true, ignored: Boolean(order?.shipment?.test) });
  }
  if (push.events.length) {
    const shipment = order.shipment as ShipmentRecord;
    let state = shipment.state;
    let events = shipment.events || [];
    for (const event of push.events) {
      const applied = applyTracking(events, state, event);
      state = applied.state;
      events = applied.events;
    }
    await db.collection("orders").updateOne({ id: order.id }, { $set: { "shipment.state": state, "shipment.events": events.slice(-40) } });
  } else {
    try {
      await refreshTracking(db, String(order.id));
    } catch {
      paymentLog("delhivery_webhook_refresh_failed", { orderId: String(order.id) });
    }
  }
  await db.collection("delhiveryEvents").updateOne({ eventId }, { $set: { status: "processed", waybill: push.waybill } });
  return NextResponse.json({ received: true });
}
