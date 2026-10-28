/**
 * Analytics unit tests — Node.js built-in test runner (node:test + tsx)
 *
 * Run: npm test
 *   or: npx tsx --test src/lib/analytics/analytics.test.ts
 */

import assert from "node:assert/strict";
import test, { beforeEach, afterEach } from "node:test";
import { sanitizeSearchTerm } from "./searchTerm";
import { claimOnce, resetDedupeForTests } from "./dedupe";
import { cartValue, itemFromCartLine, itemFromProduct, itemsFromCart } from "./items";
import {
  claimPurchaseTracking,
  hasTrackedPurchase,
  resetPurchaseDedupeForTests,
  PURCHASE_DEDUPE_KEY,
} from "./purchaseDedupe";
import { trackAddToCart, trackAddToWishlist, trackBeginCheckout, trackPurchase, trackSearch, trackViewItem } from "./events";
import { grantAnalyticsConsent, revokeAnalyticsConsent, ANALYTICS_CONSENT_KEY } from "./consent";
import { setConfiguredGtmId } from "./config";
import type { CartItem } from "@/lib/types";

type LayerEvent = Record<string, unknown>;

function installBrowserMocks(gtmId = "GTM-TEST01") {
  const store = new Map<string, string>();
  const layer: LayerEvent[] = [];

  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;

  const mockWindow = {
    dataLayer: layer,
    localStorage: storage,
    sessionStorage: storage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (globalThis as { window?: unknown }).window = mockWindow;
  process.env.NEXT_PUBLIC_GTM_ID = gtmId;
  setConfiguredGtmId(gtmId ? gtmId.toUpperCase() : null);
  return { layer, store };
}

function ecommerceEvents(layer: LayerEvent[], name: string) {
  return layer.filter((row) => row.event === name);
}

const sampleLine: CartItem = {
  id: "prod_1:100ml",
  productId: "prod_1",
  slug: "silk-veil",
  name: "Silk Veil",
  image: "/x.webp",
  categoryId: "body",
  variantLabel: "100ml",
  price: 890,
  quantity: 2,
};

beforeEach(() => {
  resetDedupeForTests();
  const { store } = installBrowserMocks();
  store.clear();
  resetPurchaseDedupeForTests();
  grantAnalyticsConsent();
});

afterEach(() => {
  revokeAnalyticsConsent();
  delete process.env.NEXT_PUBLIC_GTM_ID;
  setConfiguredGtmId(null);
  resetDedupeForTests();
});

test("sanitizeSearchTerm accepts product queries and rejects PII-like input", () => {
  assert.equal(sanitizeSearchTerm("  body butter  "), "body butter");
  assert.equal(sanitizeSearchTerm("a"), null);
  assert.equal(sanitizeSearchTerm("me@example.com"), null);
  assert.equal(sanitizeSearchTerm("9876543210"), null);
  assert.equal(sanitizeSearchTerm("call +91 98765 43210"), null);
  assert.equal(sanitizeSearchTerm("123456"), null);
});

test("item mappers build GA4 item fields without customer data", () => {
  const item = itemFromProduct(
    { id: "prod_1", name: "Silk Veil", categoryId: "body", price: 890 },
    { price: 990, quantity: 1, variantLabel: "100ml", categoryName: "Body Care" },
  );
  assert.deepEqual(item, {
    item_id: "prod_1",
    item_name: "Silk Veil",
    item_category: "Body Care",
    item_variant: "100ml",
    price: 990,
    quantity: 1,
  });
  const line = itemFromCartLine(sampleLine, "Body Care", 1);
  assert.equal(line.quantity, 1);
  assert.equal(line.item_id, "prod_1");
  assert.equal(cartValue(itemsFromCart([sampleLine], [{ id: "body", name: "Body Care" }])), 1780);
});

test("view_item pushes currency, value, and items once under Strict Mode doubles", () => {
  const { layer } = installBrowserMocks();
  grantAnalyticsConsent();
  const product = { id: "prod_1", name: "Silk Veil", categoryId: "body", price: 890 };
  assert.equal(trackViewItem({ product, price: 890, categoryName: "Body Care" }), true);
  assert.equal(trackViewItem({ product, price: 890, categoryName: "Body Care" }), false);
  const events = ecommerceEvents(layer, "view_item");
  assert.equal(events.length, 1);
  const payload = events[0].ecommerce as { currency: string; value: number; items: unknown[] };
  assert.equal(payload.currency, "INR");
  assert.equal(payload.value, 890);
  assert.equal(payload.items.length, 1);
  assert.ok(!JSON.stringify(payload).includes("@"));
});

test("search fires one event for a settled query", () => {
  const { layer } = installBrowserMocks();
  grantAnalyticsConsent();
  assert.equal(trackSearch("body butter"), true);
  assert.equal(trackSearch("body butter"), false);
  assert.equal(trackSearch("me@mail.com"), false);
  const events = ecommerceEvents(layer, "search");
  assert.equal(events.length, 1);
  assert.equal(events[0].search_term, "body butter");
});

test("add_to_cart and add_to_wishlist push success payloads", () => {
  const { layer } = installBrowserMocks();
  grantAnalyticsConsent();
  assert.equal(trackAddToCart({ line: sampleLine, quantityAdded: 1, categoryName: "Body Care" }), true);
  assert.equal(
    trackAddToWishlist({
      product: { id: "prod_1", name: "Silk Veil", categoryId: "body", price: 890 },
      categoryName: "Body Care",
    }),
    true,
  );
  assert.equal(ecommerceEvents(layer, "add_to_cart").length, 1);
  assert.equal(ecommerceEvents(layer, "add_to_wishlist").length, 1);
  const cart = ecommerceEvents(layer, "add_to_cart")[0].ecommerce as { value: number };
  assert.equal(cart.value, 890);
});

test("begin_checkout sends cart snapshot and skips empty bags", () => {
  const { layer } = installBrowserMocks();
  grantAnalyticsConsent();
  assert.equal(trackBeginCheckout({ cart: [], categories: [] }), false);
  assert.equal(
    trackBeginCheckout({
      cart: [sampleLine],
      categories: [{ id: "body", name: "Body Care" }],
    }),
    true,
  );
  assert.equal(
    trackBeginCheckout({
      cart: [sampleLine],
      categories: [{ id: "body", name: "Body Care" }],
    }),
    false,
  );
  assert.equal(ecommerceEvents(layer, "begin_checkout").length, 1);
});

test("purchase uses transaction id and ignores refresh duplicates", () => {
  const { layer, store } = installBrowserMocks();
  grantAnalyticsConsent();
  const items = [itemFromCartLine(sampleLine, "Body Care")];
  assert.equal(trackPurchase({ transactionId: "ord_1", value: 1780, items, shipping: 79 }), true);
  assert.equal(trackPurchase({ transactionId: "ord_1", value: 1780, items, shipping: 79 }), false);
  assert.equal(hasTrackedPurchase("ord_1"), true);
  assert.equal(claimPurchaseTracking("ord_1"), false);
  const events = ecommerceEvents(layer, "purchase");
  assert.equal(events.length, 1);
  const payload = events[0].ecommerce as {
    transaction_id: string;
    value: number;
    shipping: number;
    items: unknown[];
  };
  assert.equal(payload.transaction_id, "ord_1");
  assert.equal(payload.value, 1780);
  assert.equal(payload.shipping, 79);
  assert.ok(store.get(PURCHASE_DEDUPE_KEY)?.includes("ord_1"));
  assert.ok(!JSON.stringify(payload).toLowerCase().includes("email"));
  assert.ok(!JSON.stringify(payload).includes("razorpay"));
});

test("missing GTM or missing consent does not push and does not throw", () => {
  const { layer } = installBrowserMocks("");
  grantAnalyticsConsent();
  assert.equal(trackSearch("soap"), false);
  assert.equal(layer.length, 0);

  const again = installBrowserMocks("GTM-TEST01");
  revokeAnalyticsConsent();
  assert.equal(again.store.get(ANALYTICS_CONSENT_KEY), "denied");
  assert.equal(trackViewItem({
    product: { id: "p", name: "X", categoryId: "c", price: 1 },
    price: 1,
  }), false);
  // Consent update may land on dataLayer; ecommerce view_item must not.
  assert.equal(ecommerceEvents(again.layer, "view_item").length, 0);
});

test("claimOnce collapses rapid duplicate keys", () => {
  assert.equal(claimOnce("k"), true);
  assert.equal(claimOnce("k"), false);
});
