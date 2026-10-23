import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { publicOrder, type StoredOrder } from "@/lib/payments/service";
import { cancelShipment } from "@/lib/shipping/booking";
import { DelhiveryError } from "@/lib/shipping/delhivery";
import { customerCanCancel } from "@/lib/shipping/states";
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
  try {
    if (!customerCanCancel(order)) return NextResponse.json({ error: "This order has been dispatched and can no longer be cancelled." }, { status: 409 });
    if (shipment?.awb) await cancelShipment(db, order.id);
    const now = new Date().toISOString();
    const captured = order.paymentState === "captured" || order.paymentState === "refund_pending";
    await db.collection("orders").updateOne({ id: order.id }, {
      $set: {
        status: "cancelled",
        orderState: "cancelled",
        "shipment.state": "cancelled",
        ...(captured ? { paymentState: "refund_pending" } : order.payment === "cod" ? { paymentState: "cancelled" } : {}),
        updatedAt: now,
      },
      $push: {
        audit: { at: now, event: "customer_cancel" },
        ...(captured ? { refunds: { id: `rfd_${now.replace(/\W/g, "").slice(-12)}`, amountPaise: order.amountPaise, status: "refund_pending", reason: "customer_cancel", createdAt: now } } : {}),
      },
    } as never);
    const saved = await db.collection<StoredOrder>("orders").findOne({ id: order.id });
    return NextResponse.json({ order: saved ? publicOrder(saved) : null, refunded: false });
  } catch (error) {
    if (error instanceof DelhiveryError) return NextResponse.json({ error: "This order could not be cancelled." }, { status: 409 });
    return NextResponse.json({ error: "The cancellation could not be completed." }, { status: 503 });
  }
}
