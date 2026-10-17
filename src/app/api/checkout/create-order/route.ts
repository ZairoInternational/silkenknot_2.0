import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { CheckoutError, createCheckout } from "@/lib/payments/service";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { currentSession } from "@/lib/session";

export const runtime = "nodejs";

function statusFor(error: CheckoutError) {
  if (error.code === "config" || error.code === "unknown") return 503;
  if (error.code === "rate") return 429;
  if (error.code === "forbidden") return 403;
  if (error.code === "conflict" || error.code === "stock") return 409;
  return 400;
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request) || !csrfHeaderMatches(request)) {
      return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    }
    if (!databaseConfigured()) return NextResponse.json({ error: "Checkout is unavailable." }, { status: 503 });
    const session = await currentSession();
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Log in to continue." }, { status: 401 });
    }
    const body = await request.json();
    const db = await getDb();
    const user = await db.collection("users").findOne({ id: session.id });
    const result = await createCheckout({
      userId: session.id,
      email: String(user?.email || ""),
      items: body.items,
      couponCode: body.couponCode,
      address: body.address,
      idempotencyKey: body.idempotencyKey,
      checkoutMethod: body.paymentMethod,
      shippingQuoteId: body.shippingQuoteId,
      shippingOptionId: body.shippingOptionId,
      expectedAmountPaise: body.expectedAmountPaise,
    });
    if ("alreadyPaid" in result) return NextResponse.json({ verified: true, order: result.order });
    if ("cod" in result) return NextResponse.json({ placed: true, order: result.order });
    return NextResponse.json({ demo: false, ...result });
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message }, { status: statusFor(error) });
    console.error("checkout_create_failed", error instanceof Error ? error.message : "error");
    return NextResponse.json({ error: "Unable to start checkout. Please try again." }, { status: 500 });
  }
}
