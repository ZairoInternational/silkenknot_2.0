import { NextResponse } from "next/server";
import { clientIp } from "@/lib/auth/http";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { publicOrder, type StoredOrder } from "@/lib/payments/service";
import { currentSession } from "@/lib/session";
import { customerOrderVisible } from "@/lib/shipping/states";
import { toOrderDetail } from "@/lib/support/order-view";
import { supportRateLimit } from "@/lib/support/rate-limit";
import { paymentExplanation } from "@/lib/support/status-mapper";

export const runtime = "nodejs";

function validOrderId(id: string) {
  return /^[A-Za-z0-9_-]{6,80}$/.test(id);
}

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Orders are unavailable." }, { status: 503 });
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Sign in to view your orders.", code: "unauthenticated" }, { status: 401 });

  const { orderId } = await context.params;
  if (!validOrderId(orderId)) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const db = await getDb();
  const limited = await supportRateLimit(db, `${session.id}:${clientIp(request)}`, 40);
  if (!limited.ok) return NextResponse.json({ error: limited.message }, { status: 429 });

  const order = await db.collection<StoredOrder>("orders").findOne(
    session.role === "admin"
      ? { $or: [{ id: orderId }, { number: orderId }] }
      : { userId: session.id, $or: [{ id: orderId }, { number: orderId }] },
  );

  if (!order || (session.role !== "admin" && !customerOrderVisible(order))) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const pub = publicOrder(order);
  const detail = toOrderDetail(pub);
  const paymentNote = paymentExplanation(pub.paymentState, pub.payment);

  return NextResponse.json({
    order: detail,
    paymentNote,
  });
}
