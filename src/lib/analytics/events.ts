import { browserWindow } from "./browser";
import { claimOnce } from "./dedupe";
import { analyticsEnabled, pushEvent, pushEcommerceEvent } from "./dataLayer";
import { cartValue, itemFromCartLine, itemFromProduct, itemsFromCart } from "./items";
import { claimPurchaseTracking, hasTrackedPurchase } from "./purchaseDedupe";
import { sanitizeSearchTerm } from "./searchTerm";
import type { AnalyticsItem } from "./types";
import type { CartItem, Product } from "@/lib/types";

type CategoryRef = Array<{ id: string; name: string }>;

export function trackViewItem(input: {
  product: Pick<Product, "id" | "name" | "categoryId" | "price">;
  price: number;
  variantLabel?: string;
  categoryName?: string;
}): boolean {
  const key = `view_item:${input.product.id}`;
  if (!claimOnce(key)) return false;
  const item = itemFromProduct(input.product, {
    price: input.price,
    quantity: 1,
    variantLabel: input.variantLabel,
    categoryName: input.categoryName,
  });
  return pushEcommerceEvent("view_item", {
    currency: "INR",
    value: item.price,
    items: [item],
  });
}

export function trackSearch(rawTerm: string): boolean {
  const search_term = sanitizeSearchTerm(rawTerm);
  if (!search_term) return false;
  const key = `search:${search_term.toLowerCase()}`;
  if (!claimOnce(key, 2500)) return false;
  return pushEvent("search", { search_term });
}

export function trackAddToCart(input: {
  line: CartItem;
  quantityAdded: number;
  categoryName?: string;
}): boolean {
  const quantity = Math.max(1, Math.floor(input.quantityAdded));
  const item = itemFromCartLine(input.line, input.categoryName, quantity);
  // Collapse Strict Mode double-invokes; allow intentional re-adds after the window.
  const dedupeKey = `add_to_cart:${item.item_id}:${item.item_variant}:${quantity}`;
  if (!claimOnce(dedupeKey, 400)) return false;
  return pushEcommerceEvent("add_to_cart", {
    currency: "INR",
    value: item.price * item.quantity,
    items: [item],
  });
}

export function trackAddToWishlist(input: {
  product: Pick<Product, "id" | "name" | "categoryId" | "price">;
  price?: number;
  categoryName?: string;
}): boolean {
  const key = `add_to_wishlist:${input.product.id}`;
  if (!claimOnce(key, 400)) return false;
  const item = itemFromProduct(input.product, {
    price: input.price,
    quantity: 1,
    categoryName: input.categoryName,
  });
  return pushEcommerceEvent("add_to_wishlist", {
    currency: "INR",
    value: item.price,
    items: [item],
  });
}

export function trackBeginCheckout(input: {
  cart: CartItem[];
  categories: CategoryRef;
}): boolean {
  if (!input.cart.length) return false;
  const fingerprint = input.cart
    .map((line) => `${line.productId}:${line.variantLabel}:${line.quantity}`)
    .join("|");
  const key = `begin_checkout:${fingerprint}`;
  if (!claimOnce(key, 4000)) return false;
  const session = browserWindow()?.sessionStorage;
  if (session) {
    try {
      const stored = session.getItem("silkknot.analytics.begin_checkout");
      if (stored === fingerprint) return false;
      session.setItem("silkknot.analytics.begin_checkout", fingerprint);
    } catch {
      /* ignore */
    }
  }
  const items = itemsFromCart(input.cart, input.categories);
  return pushEcommerceEvent("begin_checkout", {
    currency: "INR",
    value: cartValue(items),
    items,
  });
}

export function trackPurchase(input: {
  transactionId: string;
  value: number;
  items: AnalyticsItem[];
  shipping?: number;
}): boolean {
  const transaction_id = input.transactionId.trim();
  if (!transaction_id || !input.items.length) return false;
  // Do not durable-claim when analytics is off — thank-you refresh after consent should still send.
  if (!analyticsEnabled()) return false;
  if (hasTrackedPurchase(transaction_id)) return false;
  if (!claimOnce(`purchase:${transaction_id}`, 5000)) return false;
  const payload: {
    transaction_id: string;
    currency: "INR";
    value: number;
    items: AnalyticsItem[];
    shipping?: number;
  } = {
    transaction_id,
    currency: "INR",
    value: input.value,
    items: input.items,
  };
  if (typeof input.shipping === "number" && Number.isFinite(input.shipping) && input.shipping >= 0) {
    payload.shipping = input.shipping;
  }
  const sent = pushEcommerceEvent("purchase", payload);
  if (sent) claimPurchaseTracking(transaction_id);
  return sent;
}
