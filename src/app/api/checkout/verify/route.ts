import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { CheckoutError, confirmPayment } from "@/lib/payments/service";
import { databaseConfigured } from "@/lib/mongo";
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
      return NextResponse.json({ verified: false, error: "Request blocked." }, { status: 403 });
    }
    if (!databaseConfigured()) return NextResponse.json({ verified: false, error: "Checkout is unavailable." }, { status: 503 });
    const session = await currentSession();
    if (!session || session.role !== "customer") {
      return NextResponse.json({ verified: false, error: "Log in to continue." }, { status: 401 });
    }
    const body = await request.json() as Record<string, unknown>;
    const razorpayOrderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
    const razorpayPaymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
    const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
    const orderId = typeof body.checkoutOrderId === "string" ? body.checkoutOrderId : "";
    if (!razorpayOrderId || !razorpayPaymentId || !signature || !orderId) {
      return NextResponse.json({ verified: false, error: "Missing payment verification data." }, { status: 400 });
    }
    const result = await confirmPayment({
      userId: session.id,
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      signature,
      source: "browser",
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ verified: false, error: error.message }, { status: statusFor(error) });
    }
    return NextResponse.json({ verified: false, error: "Could not verify payment." }, { status: 503 });
  }
}
