export type PaymentConfig = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  mode: "test" | "live";
};

export class PaymentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConfigError";
  }
}

export function readPaymentConfig(env: NodeJS.ProcessEnv): PaymentConfig {
  const keyId = env.RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = env.RAZORPAY_KEY_SECRET?.trim() || "";
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET?.trim() || "";
  const live = keyId.startsWith("rzp_live_");
  const test = keyId.startsWith("rzp_test_");
  if (!keyId || !keySecret || keyId.includes("replace_me") || keySecret.includes("replace_me")) {
    throw new PaymentConfigError("Payment is not configured.");
  }
  if (!live && !test) throw new PaymentConfigError("Payment key is not a Razorpay key.");
  const stagingRehearsal = env.NODE_ENV === "production"
    && env.DELHIVERY_ENVIRONMENT?.trim() === "staging"
    && env.CHECKOUT_STAGING_REHEARSAL === "1";
  if (env.NODE_ENV === "production" && !stagingRehearsal) {
    if (!live) throw new PaymentConfigError("Production checkout requires live Razorpay keys.");
    if (!webhookSecret) throw new PaymentConfigError("Production checkout requires a webhook secret.");
  } else if (live) {
    throw new PaymentConfigError("Live Razorpay keys are blocked outside production.");
  }
  return { keyId, keySecret, webhookSecret, mode: live ? "live" : "test" };
}

export function paymentConfig() {
  return readPaymentConfig(process.env);
}
