import { NextResponse } from "next/server";
import { clientIp } from "@/lib/auth/http";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { publicOrder, type StoredOrder } from "@/lib/payments/service";
import { currentSession } from "@/lib/session";
import { customerOrderVisible } from "@/lib/shipping/states";
import { toOrderSummary } from "@/lib/support/order-view";
import { supportRateLimit } from "@/lib/support/rate-limit";

export const runtime = "nodejs";

const LIMIT = 8;

export async function GET(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Orders are unavailable." }, { status: 503 });
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Sign in to view your orders.", code: "unauthenticated" }, { status: 401 });
  if (session.role !== "customer" && session.role !== "admin") {
    return NextResponse.json({ error: "Sign in to view your orders.", code: "unauthenticated" }, { status: 401 });
  }

  const db = await getDb();
  const limited = await supportRateLimit(db, `${session.id}:${clientIp(request)}`, 40);
  if (!limited.ok) return NextResponse.json({ error: limited.message }, { status: 429 });

  const cursor = db
    .collection<StoredOrder>("orders")
    .find({ userId: session.id })
    .sort({ createdAt: -1 })
    .limit(40);

  const rows = await cursor.toArray();
  const visible = rows.filter((order) => customerOrderVisible(order)).slice(0, LIMIT);
  const orders = visible.map((order) => toOrderSummary(publicOrder(order)));

  return NextResponse.json({
    orders,
    hasMore: rows.filter((order) => customerOrderVisible(order)).length > LIMIT,
    ordersPath: "/account/orders",
  });
}
