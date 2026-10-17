import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { publicOrder, requestRefund, type StoredOrder } from "@/lib/payments/service";
import { bookOrder, cancelShipment, createReturnManifest, loadPolicy, refreshTracking, schedulePickup, shippingLabel } from "@/lib/shipping/booking";
import { DelhiveryError } from "@/lib/shipping/delhivery";
import { publicPolicy } from "@/lib/shipping/policy";
import { currentSession } from "@/lib/session";

export const runtime = "nodejs";

async function adminDb(request: Request, write: boolean) {
  if (!sameOrigin(request) || (write && !csrfHeaderMatches(request))) return { error: NextResponse.json({ error: "Request blocked." }, { status: 403 }) };
  if (!databaseConfigured()) return { error: NextResponse.json({ error: "Unavailable." }, { status: 503 }) };
  const session = await currentSession();
  if (!session || session.role !== "admin") return { error: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  return { db: await getDb() };
}

export async function GET(request: Request) {
  const gate = await adminDb(request, false);
  if ("error" in gate && gate.error) return gate.error;
  const policy = await loadPolicy(gate.db!);
  return NextResponse.json({ policy: publicPolicy(policy) });
}

export async function POST(request: Request) {
  const gate = await adminDb(request, true);
  if ("error" in gate && gate.error) return gate.error;
  const db = gate.db!;
  const body = await request.json();
  const action = String(body.action || "");
  const orderId = String(body.orderId || "");
  try {
    if (action === "save-settings") {
      const overrides = {
        delhiveryEnabled: body.delhiveryEnabled === true,
        standardPaise: Number(body.standardPaise),
        expressPaise: Number(body.expressPaise),
        freeShippingPaise: Number(body.freeShippingPaise),
        codEnabled: body.codEnabled === true,
        codFeePaise: Number(body.codFeePaise),
        bookingMode: body.bookingMode === "manual" ? "manual" : "auto",
        pickupLocation: String(body.pickupLocation || ""),
        standardEta: String(body.standardEta || ""),
        expressEta: String(body.expressEta || ""),
        returnWindowDays: Number(body.returnWindowDays),
      };
      await db.collection("storeSettings").updateOne({ id: "shipping" }, { $set: { id: "shipping", overrides, updatedAt: new Date().toISOString() } }, { upsert: true });
      return NextResponse.json({ policy: publicPolicy(await loadPolicy(db)) });
    }
    if (!orderId) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (action === "refresh") await refreshTracking(db, orderId);
    else if (action === "retry-booking") {
      if (body.acknowledgeAbsent !== true) return NextResponse.json({ error: "Confirm that Delhivery has no shipment for this order before retrying an uncertain booking." }, { status: 409 });
      await db.collection("orders").updateOne({ id: orderId }, { $set: { "shipment.uncertain": false } });
      await db.collection("shipmentTasks").updateOne({ orderId }, { $set: { status: "queued", nextAttemptAt: new Date().toISOString() } });
      await bookOrder(db, orderId, true);
    }
    else if (action === "shipping-label") {
      const pdfSize = body.pdfSize === "4R" ? "4R" : body.pdfSize === "A4" ? "A4" : "";
      if (!pdfSize) return NextResponse.json({ error: "Choose an A4 or 4R label." }, { status: 400 });
      const label = await shippingLabel(db, orderId, pdfSize, body.pdf !== false);
      const order = await db.collection<StoredOrder>("orders").findOne({ id: orderId });
      return NextResponse.json({ order: order ? publicOrder(order) : null, label });
    }
    else if (action === "pickup") await schedulePickup(db, orderId);
    else if (action === "cancel-shipment") {
      if (body.confirm !== true) return NextResponse.json({ error: "Confirm the cancellation." }, { status: 409 });
      await cancelShipment(db, orderId);
    }
    else if (action === "manual") {
      await db.collection("orders").updateOne({ id: orderId }, { $set: { "shipment.provider": "manual", "shipment.state": "not_created" } });
      await db.collection("shipmentTasks").updateOne({ orderId }, { $set: { status: "manual" } });
    }
    else if (action === "approve-return") await createReturnManifest(db, orderId);
    else if (action === "reject-return") {
      await db.collection("orders").updateOne({ id: orderId, status: "return_requested" }, { $set: { status: "delivered", "shipment.state": "delivered" }, $push: { audit: { at: new Date().toISOString(), event: "return_rejected" } } } as never);
    }
    else if (action === "refund") {
      const order = await requestRefund(orderId);
      return NextResponse.json({ order });
    }
    else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    const order = await db.collection<StoredOrder>("orders").findOne({ id: orderId });
    return NextResponse.json({ order: order ? publicOrder(order) : null });
  } catch (error) {
    const message = error instanceof DelhiveryError || error instanceof Error ? error.message : "Could not update fulfilment.";
    const status = error instanceof DelhiveryError && error.kind === "rejected" ? 409 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
