import assert from "node:assert/strict";
import test from "node:test";
import { readPaymentConfig } from "./config";
import { reserveFilter } from "./inventory";
import { percentOfPaise, rupeesToPaise } from "./money";
import { resolvePlatformFee } from "./platformFee";
import { quoteCart, quoteCartDroppingStaleCoupon } from "./quote";
import { checkoutSignatureValid, hmacSha256Hex, webhookSignatureValid } from "./signature";
import { fulfillmentTransition, paymentTransition } from "./states";
import type { Coupon, Product } from "../types";

const secret = "test-key-secret";

test("rupee prices become exact paise", () => {
  assert.equal(rupeesToPaise(799), 79900);
  assert.equal(percentOfPaise(99900, 10), 9990);
});

test("checkout signature matches Razorpay order and payment", () => {
  const signature = hmacSha256Hex(secret, "order_1|pay_1");
  assert.equal(checkoutSignatureValid(secret, "order_1", "pay_1", signature), true);
  assert.equal(checkoutSignatureValid(secret, "order_1", "pay_2", signature), false);
  assert.equal(checkoutSignatureValid(secret, "order_1", "pay_1", "abcd"), false);
});

test("webhook signature uses the raw body", () => {
  const body = "{\"event\":\"payment.captured\"}";
  const signature = hmacSha256Hex("whsec_test", body);
  assert.equal(webhookSignatureValid("whsec_test", body, signature), true);
  assert.equal(webhookSignatureValid("whsec_test", body + " ", signature), false);
});

test("quote ignores client prices and adds standard shipping", () => {
  const product = {
    id: "p1",
    slug: "soap",
    name: "Soap",
    price: 500,
    categoryId: "bath-soap",
    images: ["/soap.jpg"],
    active: true,
    variants: [{ id: "v", label: "Bar", price: 500, stock: 4 }],
  } as unknown as Product;
  const quote = quoteCart([product], [], [{ productId: "p1", variantLabel: "Bar", quantity: 1 }], "");
  assert.equal(quote.subtotalPaise, 50000);
  assert.equal(quote.shippingPaise, 7900);
  assert.equal(quote.platformFeePaise, 0);
  assert.equal(quote.amountPaise, 57900);
  assert.equal(quote.lines[0].price, 500);
});

test("quote can include a platform fee in the payable total", () => {
  const product = {
    id: "p1",
    slug: "soap",
    name: "Soap",
    price: 500,
    categoryId: "bath-soap",
    images: ["/soap.jpg"],
    active: true,
    variants: [{ id: "v", label: "Bar", price: 500, stock: 4 }],
  } as unknown as Product;
  const quote = quoteCart([product], [], [{ productId: "p1", variantLabel: "Bar", quantity: 1 }], "", {
    method: "standard",
    chargePaise: 7900,
    platformFeePaise: 3000,
  });
  assert.equal(quote.platformFeePaise, 3000);
  assert.equal(quote.amountPaise, 60900);
});

test("platform fee waives on first order or high bag value", () => {
  const policy = { enabled: true, feePaise: 3000, waiveAbovePaise: 100000, waiveFirstOrder: true };
  assert.equal(resolvePlatformFee(policy, { netPaise: 50000, isFirstOrder: true }).chargePaise, 0);
  assert.equal(resolvePlatformFee(policy, { netPaise: 100000, isFirstOrder: false }).chargePaise, 0);
  assert.equal(resolvePlatformFee(policy, { netPaise: 50000, isFirstOrder: false }).chargePaise, 3000);
});

test("quote rejects a coupon that does not apply", () => {
  const product = {
    id: "p1",
    slug: "soap",
    name: "Soap",
    price: 500,
    categoryId: "bath-soap",
    images: [],
    active: true,
    variants: [{ id: "v", label: "Bar", price: 500, stock: 4 }],
  } as unknown as Product;
  const coupon = { id: "c", code: "VEIL", type: "fixed", value: 100, scope: "product", productId: "other", active: true, label: "Veil" } as Coupon;
  assert.throws(() => quoteCart([product], [coupon], [{ productId: "p1", variantLabel: "Bar", quantity: 1 }], "VEIL"));
});

test("shipping quote drops a stale product coupon instead of failing", () => {
  const product = {
    id: "p1",
    slug: "soap",
    name: "Soap",
    price: 500,
    categoryId: "bath-soap",
    images: [],
    active: true,
    variants: [{ id: "v", label: "Bar", price: 500, stock: 4 }],
  } as unknown as Product;
  const coupon = { id: "c", code: "VEIL", type: "fixed", value: 100, scope: "product", productId: "other", active: true, label: "Veil" } as Coupon;
  const result = quoteCartDroppingStaleCoupon([product], [coupon], [{ productId: "p1", variantLabel: "Bar", quantity: 1 }], "VEIL");
  assert.equal(result.quote.discountPaise, 0);
  assert.equal(result.quote.couponCode, undefined);
  assert.equal(result.droppedCoupon?.code, "VEIL");
  assert.match(result.droppedCoupon?.message || "", /no longer applies/);
});

test("stock reservation requires the quantity to still be available", () => {
  assert.deepEqual(reserveFilter("p1", "Bar", 2), {
    id: "p1",
    variants: { $elemMatch: { label: "Bar", stock: { $gte: 2 } } },
  });
});

test("captured payments do not regress, and fulfilment cannot skip steps", () => {
  assert.equal(paymentTransition("captured", "failed"), false);
  assert.equal(paymentTransition("captured", "refund_pending"), true);
  assert.equal(paymentTransition("pending", "captured"), true);
  assert.equal(fulfillmentTransition("unfulfilled", "shipped"), false);
  assert.equal(fulfillmentTransition("packed", "shipped"), true);
});

test("production rejects test keys and development rejects live keys", () => {
  assert.throws(() => readPaymentConfig({
    NODE_ENV: "production",
    RAZORPAY_KEY_ID: "rzp_test_example",
    RAZORPAY_KEY_SECRET: "secret",
    RAZORPAY_WEBHOOK_SECRET: "whsec",
  }));
  assert.throws(() => readPaymentConfig({
    NODE_ENV: "development",
    RAZORPAY_KEY_ID: "rzp_live_example",
    RAZORPAY_KEY_SECRET: "secret",
    RAZORPAY_WEBHOOK_SECRET: "whsec",
  }));
  assert.throws(() => readPaymentConfig({
    NODE_ENV: "production",
    RAZORPAY_KEY_ID: "rzp_live_example",
    RAZORPAY_KEY_SECRET: "secret",
  }));
  assert.throws(() => readPaymentConfig({
    NODE_ENV: "production",
    DELHIVERY_ENVIRONMENT: "production",
    CHECKOUT_STAGING_REHEARSAL: "1",
    RAZORPAY_KEY_ID: "rzp_test_example",
    RAZORPAY_KEY_SECRET: "secret",
  }));
  const rehearsal = readPaymentConfig({
    NODE_ENV: "production",
    DELHIVERY_ENVIRONMENT: "staging",
    CHECKOUT_STAGING_REHEARSAL: "1",
    RAZORPAY_KEY_ID: "rzp_test_example",
    RAZORPAY_KEY_SECRET: "secret",
  });
  assert.equal(rehearsal.mode, "test");
  const config = readPaymentConfig({
    NODE_ENV: "development",
    RAZORPAY_KEY_ID: "rzp_test_example",
    RAZORPAY_KEY_SECRET: "secret",
  });
  assert.equal(config.mode, "test");
});
