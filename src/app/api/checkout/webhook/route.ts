import { NextResponse } from "next/server";
import { paymentConfig, PaymentConfigError } from "@/lib/payments/config";
import { paymentLog } from "@/lib/payments/log";
import { webhookSignatureValid } from "@/lib/payments/signature";
import { CheckoutError, acceptWebhook } from "@/lib/payments/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  let secret = "";
  try {
    secret = paymentConfig().webhookSecret;
  } catch (error) {
    if (error instanceof PaymentConfigError) {
      return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
    }
    throw error;
  }
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const signature = request.headers.get("x-razorpay-signature") || "";
  if (!webhookSignatureValid(secret, raw, signature)) {
    paymentLog("webhook_rejected", { reason: "signature" });
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  try {
    JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }
  try {
    await acceptWebhook(raw, request.headers.get("x-razorpay-event-id") || "");
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof CheckoutError && error.code === "unknown") {
      return NextResponse.json({ error: "Retry later." }, { status: 503 });
    }
    paymentLog("webhook_retry", { code: error instanceof CheckoutError ? error.code : "error" });
    return NextResponse.json({ error: "Retry later." }, { status: 503 });
  }
}
