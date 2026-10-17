import { NextResponse } from "next/server";
import { safeEqualText } from "@/lib/payments/signature";
import { paymentLog } from "@/lib/payments/log";
import { reconcileOpenOrders } from "@/lib/payments/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const configured = process.env.CHECKOUT_RECONCILE_SECRET?.trim() || "";
  const sent = request.headers.get("x-silkknot-reconcile") || "";
  if (!configured || !safeEqualText(configured, sent)) {
    paymentLog("reconcile_rejected", { reason: "auth" });
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const result = await reconcileOpenOrders();
  return NextResponse.json({ ok: true, ...result });
}
