import { NextResponse } from "next/server";
import { clientIp, csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { publicOrder, type StoredOrder } from "@/lib/payments/service";
import { currentSession } from "@/lib/session";
import { refreshTracking } from "@/lib/shipping/booking";
import { DelhiveryError } from "@/lib/shipping/delhivery";
import { customerOrderVisible } from "@/lib/shipping/states";
import { toOrderDetail } from "@/lib/support/order-view";
import { supportRateLimit } from "@/lib/support/rate-limit";
import { paymentExplanation } from "@/lib/support/status-mapper";

export const runtime = "nodejs";

function validOrderId(id: string) {
  return /^[A-Za-z0-9_-]{6,80}$/.test(id);
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  if (!sameOrigin(request) || !csrfHeaderMatches(request)) {
    return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  }
  if (!databaseConfigured()) return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Sign in to continue.", code: "unauthenticated" }, { status: 401 });

  const { orderId } = await context.params;
  if (!validOrderId(orderId)) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const db = await getDb();
  const limited = await supportRateLimit(db, `refresh:${session.id}:${clientIp(request)}`, 20);
  if (!limited.ok) return NextResponse.json({ error: limited.message }, { status: 429 });

  const query =
    session.role === "admin"
      ? { $or: [{ id: orderId }, { number: orderId }] }
      : { userId: session.id, $or: [{ id: orderId }, { number: orderId }] };
  const order = await db.collection<StoredOrder>("orders").findOne(query);
  if (!order || (session.role !== "admin" && !customerOrderVisible(order))) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (!order.shipment?.awb) {
    return NextResponse.json({ error: "Tracking is not available yet for this order.", order: toOrderDetail(publicOrder(order)) }, { status: 404 });
  }

  const last = order.shipment.lastTrackingAt ? new Date(order.shipment.lastTrackingAt).getTime() : 0;
  if (!order.shipment.test && Date.now() - last < 30_000) {
    const pub = publicOrder(order);
    return NextResponse.json({
      order: toOrderDetail(pub),
      paymentNote: paymentExplanation(pub.paymentState, pub.payment),
      cached: true,
    });
  }

  try {
    const saved = await refreshTracking(db, order.id);
    const pub = publicOrder((saved as StoredOrder | null) || order);
    return NextResponse.json({
      order: toOrderDetail(pub),
      paymentNote: paymentExplanation(pub.paymentState, pub.payment),
    });
  } catch (error) {
    const pub = publicOrder(order);
    if (error instanceof DelhiveryError) {
      return NextResponse.json(
        {
          error: "Tracking could not be refreshed. The last known status is unchanged.",
          order: toOrderDetail(pub),
          paymentNote: paymentExplanation(pub.paymentState, pub.payment),
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Tracking could not be refreshed." }, { status: 503 });
  }
}
