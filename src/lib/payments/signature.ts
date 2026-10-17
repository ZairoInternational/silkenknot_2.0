import { createHmac, timingSafeEqual } from "node:crypto";

export function hmacSha256Hex(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqualText(expected: string, received: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Razorpay Checkout signs `order_id|payment_id` with the key secret. */
export function checkoutSignatureValid(keySecret: string, orderId: string, paymentId: string, signature: string) {
  if (!keySecret || !orderId || !paymentId || !signature) return false;
  const expected = hmacSha256Hex(keySecret, `${orderId}|${paymentId}`);
  return safeEqualText(expected, signature);
}

/** Razorpay webhooks sign the raw body with the webhook secret. */
export function webhookSignatureValid(webhookSecret: string, rawBody: string, signature: string) {
  if (!webhookSecret || !rawBody || !signature) return false;
  return safeEqualText(hmacSha256Hex(webhookSecret, rawBody), signature);
}
