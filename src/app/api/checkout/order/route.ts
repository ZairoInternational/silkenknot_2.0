import { NextResponse } from "next/server";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { publicOrder, type StoredOrder } from "@/lib/payments/service";
import { currentSession } from "@/lib/session";
import { customerOrderVisible } from "@/lib/shipping/states";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Orders are unavailable." }, { status: 503 });
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Log in to continue." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const db = await getDb();
  const order = await db.collection<StoredOrder>("orders").findOne(
    session.role === "admin" ? { $or: [{ id }, { number: id }] } : { userId: session.id, $or: [{ id }, { number: id }] },
  );
  if (!order || (session.role !== "admin" && !customerOrderVisible(order))) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  return NextResponse.json({ order: publicOrder(order) });
}
