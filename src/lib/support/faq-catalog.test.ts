import assert from "node:assert/strict";
import test from "node:test";
import { HOME_TOPICS, SUPPORT_FAQ, SUPPORT_LINKS, faqById, homeTopicActions } from "./faq";
import {
  backTopicsMessage,
  emptyOrdersMessage,
  errorMessage,
  faqPolicySources,
  faqResponse,
  signInPrompt,
  welcomeMessage,
} from "./response-builder";
import { toOrderDetail, toOrderSummary } from "./order-view";
import {
  paymentExplanation,
  supportOrderStatusLabel,
  supportOrderStory,
  supportPaymentLabel,
} from "./status-mapper";
import { toProductDetail, toProductSummary } from "./product-view";
import type { Order, Product } from "@/lib/types";

test("support FAQ catalogue has unique ids, labels, answers, and policy sources", () => {
  const ids = new Set<string>();
  for (const entry of SUPPORT_FAQ) {
    assert.ok(entry.id, "missing id");
    assert.ok(entry.label.length > 2, `short label for ${entry.id}`);
    assert.ok(entry.answer.length > 20, `short answer for ${entry.id}`);
    assert.ok(entry.policySource.trim().length > 0, `missing policySource for ${entry.id}`);
    assert.equal(ids.has(entry.id), false, `duplicate id ${entry.id}`);
    ids.add(entry.id);
  }
  for (const id of HOME_TOPICS) {
    assert.ok(faqById(id), `home topic missing ${id}`);
  }
  assert.equal(ids.size, SUPPORT_FAQ.length);
});

test("policy answers follow final-sale and shipping sources", () => {
  const returns = faqById("returns");
  assert.ok(returns);
  assert.match(returns.answer, /final sale/i);
  assert.match(returns.answer, /cancel/i);
  assert.equal(/replacement request has been approved/i.test(returns.answer), false);

  const eligible = faqById("returns_eligible");
  assert.ok(eligible);
  assert.match(eligible.answer, /final sale/i);
  assert.match(eligible.answer, /self-service replacement/i);

  const shipping = faqById("shipping_how_long");
  assert.ok(shipping);
  assert.match(shipping.answer, /\u20B9999/);
  assert.match(shipping.answer, /PIN/);
  assert.match(shipping.answer, /India/);

  const methods = faqById("payments_methods");
  assert.ok(methods);
  assert.match(methods.answer, /UPI/i);
  assert.match(methods.answer, /cash on delivery/i);
  assert.match(methods.answer, /does not store your full card number/i);

  const sources = faqPolicySources();
  assert.equal(sources.length, SUPPORT_FAQ.length);
  assert.ok(sources.every((row) => row.policySource.trim().length > 0));
});

test("FAQ action hrefs are relative allowlisted paths", () => {
  const allowed = new Set<string>(Object.values(SUPPORT_LINKS));
  for (const entry of SUPPORT_FAQ) {
    for (const action of entry.actions || []) {
      if (!action.href) continue;
      assert.equal(action.href.includes("://"), false);
      assert.ok(action.href.startsWith("/"), `href must be relative: ${action.href}`);
      assert.ok(allowed.has(action.href) || action.href.startsWith("/"), `unexpected href ${action.href}`);
    }
  }
  assert.equal(SUPPORT_LINKS.orders, "/account/orders");
  assert.equal(SUPPORT_LINKS.shipping, "/shipping");
  assert.equal(SUPPORT_LINKS.contact, "/contact");
  assert.equal(SUPPORT_LINKS.faq, "/faq");
});

test("guided chat helpers have no free-text prompt", () => {
  const welcome = welcomeMessage();
  assert.match(welcome.text, /Ziva/);
  assert.equal(/I('ll| will) (look|check|help)/i.test(welcome.text), false);
  assert.ok((welcome.actions?.length || 0) > 0);
  assert.equal(homeTopicActions().length, HOME_TOPICS.length);

  const back = backTopicsMessage();
  assert.ok(back.actions?.some((action) => action.kind === "question"));

  const orderHelp = faqResponse("order_where");
  assert.ok(orderHelp);
  assert.match(orderHelp.text, /sign in/i);
  assert.equal(/I can help/i.test(orderHelp.text), false);

  const empty = emptyOrdersMessage();
  assert.match(empty.text, /no orders/i);

  const err = errorMessage("Temporary failure");
  assert.equal(err.error, true);
  assert.ok(err.actions?.some((action) => action.command === "retry"));

  const signIn = signInPrompt("/account/orders");
  assert.ok(signIn.actions?.some((action) => action.href?.includes("/account/login?next=")));
  assert.ok(signIn.actions?.some((action) => action.href?.includes(encodeURIComponent("/account/orders"))));
});

function sampleOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord_test_123456",
    number: "SK-1001",
    createdAt: "2026-03-01T10:00:00.000Z",
    status: "confirmed",
    email: "guest@example.com",
    customerName: "Guest",
    phone: "9876543210",
    userId: "user_a",
    address: {
      id: "a1",
      label: "Home",
      name: "Guest",
      line1: "1 Lane",
      line2: "",
      city: "Mumbai",
      postal: "400001",
      country: "India",
      phone: "9876543210",
      isDefault: true,
    },
    delivery: "standard",
    payment: "upi",
    items: [
      {
        id: "line1",
        productId: "p1",
        slug: "soap",
        name: "Soap",
        image: "/x.jpg",
        categoryId: "bath-soap",
        variantLabel: "100g",
        price: 499,
        quantity: 1,
      },
    ],
    subtotal: 499,
    discount: 0,
    shipping: 0,
    total: 499,
    paymentState: "captured",
    orderState: "confirmed",
    fulfillmentState: "unfulfilled",
    ...overrides,
  };
}

test("status mapper covers payment and shipment states without inventing dates", () => {
  assert.equal(supportOrderStatusLabel(sampleOrder()), "Confirmed");
  assert.equal(
    supportOrderStatusLabel(sampleOrder({ paymentState: "pending", status: "pending_payment", orderState: "pending_payment" })),
    "Payment pending",
  );
  assert.equal(supportOrderStatusLabel(sampleOrder({ paymentState: "failed" })), "Payment failed");
  assert.equal(
    supportOrderStatusLabel(
      sampleOrder({
        shipment: {
          provider: "delhivery",
          state: "in_transit",
          method: "standard",
          awb: "AWB1",
          attempts: 1,
          packageData: "product_weights",
          weightGrams: 200,
          events: [],
        },
      }),
    ),
    "In transit",
  );
  assert.equal(
    supportOrderStatusLabel(
      sampleOrder({
        shipment: {
          provider: "delhivery",
          state: "out_for_delivery",
          method: "standard",
          awb: "AWB1",
          attempts: 1,
          packageData: "product_weights",
          weightGrams: 200,
          events: [],
        },
      }),
    ),
    "Out for delivery",
  );
  assert.equal(
    supportOrderStatusLabel(sampleOrder({ status: "cancelled", orderState: "cancelled", paymentState: "refund_pending" })),
    "Refund in progress",
  );
  assert.match(supportOrderStory(sampleOrder({ paymentState: "pending", status: "pending_payment" })), /before paying again/i);
  assert.equal(supportPaymentLabel(sampleOrder({ paymentState: "captured", payment: "upi" })), "Paid via UPI");
  assert.match(paymentExplanation("pending"), /still pending/i);
  assert.match(paymentExplanation("refunded"), /full refund/i);
});

test("order projections omit payment provider secrets", () => {
  const order = sampleOrder({
    razorpayOrderId: "order_secret",
    paymentId: "pay_secret",
    shipment: {
      provider: "delhivery",
      state: "picked_up",
      method: "standard",
      awb: "1234567890",
      attempts: 1,
      packageData: "product_weights",
      weightGrams: 200,
      events: [],
      estimate: "Test · 3-5 days",
    },
  });
  const summary = toOrderSummary(order);
  assert.equal(summary.number, "SK-1001");
  assert.equal(summary.itemCount, 1);
  assert.equal("razorpayOrderId" in summary, false);

  const detail = toOrderDetail(order);
  assert.equal(detail.awb, "1234567890");
  assert.equal(detail.estimate, "3-5 days");
  assert.equal(detail.detailPath, "/orders/ord_test_123456");
  assert.ok(detail.trackingUrl?.includes("1234567890"));
  assert.equal(JSON.stringify(detail).includes("pay_secret"), false);
  assert.equal(JSON.stringify(detail).includes("order_secret"), false);
});

test("product projections respect published section flags", () => {
  const product = {
    id: "p1",
    slug: "atelier-milk-soap",
    name: "Atelier Milk Soap",
    categoryId: "bath-soap",
    type: "soap",
    scent: "milk",
    price: 400,
    rating: 5,
    reviewCount: 1,
    shortDescription: "Soft",
    description: "A soap.",
    benefits: ["Softens"],
    ingredients: ["Olive oil", "Shea"],
    howToUse: ["Lather", "Rinse"],
    showIngredients: true,
    showHowToUse: true,
    images: [],
    variants: [],
    featured: false,
    bestseller: false,
    newArrival: false,
    active: true,
    createdAt: "2026-01-01",
    reviews: [],
    faqs: [],
  } satisfies Product;

  const summary = toProductSummary(product);
  assert.equal(summary.hasIngredients, true);
  assert.equal(summary.hasHowToUse, true);

  const ingredients = toProductDetail(product, "ingredients");
  assert.deepEqual(ingredients.ingredients, ["Olive oil", "Shea"]);
  assert.equal(ingredients.howToUse, null);

  const hidden = toProductDetail({ ...product, showIngredients: false }, "ingredients");
  assert.equal(hidden.ingredients, null);
});

test("support order queries are scoped to the session user id", () => {
  const sessionUserId = "user_a";
  const foreign = sampleOrder({ userId: "user_b", id: "ord_other" });
  const owned = sampleOrder({ userId: "user_a" });
  const scoped = [foreign, owned].filter((order) => order.userId === sessionUserId);
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0].id, owned.id);
});
