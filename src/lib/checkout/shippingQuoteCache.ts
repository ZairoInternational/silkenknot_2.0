import { csrfHeaders } from "@/lib/auth/browser";

export const SHIPPING_QUOTE_CACHE_KEY = "silkknot.checkout.shippingQuote";

export type ShippingQuoteItem = {
  productId: string;
  variantLabel: string;
  quantity: number;
};

export type ShippingQuoteOption = {
  id: "standard" | "express";
  label: string;
  detail: string;
  chargePaise: number;
  codChargePaise?: number | null;
  estimateRupees?: number | null;
  codEstimateRupees?: number | null;
  shippingDiscountPaise: number;
  estimate: string;
  estimateSource?: "store_policy" | "delhivery_tat" | "none";
  available: boolean;
};

export type ShippingQuoteBody = {
  quoteId: string;
  expiresAt: string;
  options?: ShippingQuoteOption[];
  codEligible?: boolean;
  codFeePaise?: number;
  subtotalPaise?: number;
  discountPaise?: number;
  freeShippingPaise?: number;
  platformFeePaise?: number;
  platformFeeListPaise?: number;
  platformFeeWaiveAbovePaise?: number;
  platformFeeWaiveFirstOrder?: boolean;
  platformFeeFirstOrderEnabled?: boolean;
  couponRemoved?: boolean;
  couponNotice?: string | null;
  error?: string;
  code?: string;
};

type StoredQuote = {
  cacheKey: string;
  fetchedAt: string;
  body: ShippingQuoteBody;
};

const inflight = new Map<string, Promise<ShippingQuoteBody | null>>();

export function shippingQuoteCartKey(items: ShippingQuoteItem[]) {
  return items.map((item) => `${item.productId}:${item.variantLabel}:${item.quantity}`).join("|");
}

export function shippingQuoteCacheKey(postalCode: string, cartKey: string, couponCode: string | null | undefined = "") {
  return `${postalCode.trim()}|${cartKey}|${String(couponCode || "").trim().toLowerCase()}`;
}

export function cartItemsFromKey(cartKey: string): ShippingQuoteItem[] {
  return cartKey.split("|").filter(Boolean).map((row) => {
    const [productId, variantLabel, quantity] = row.split(":");
    return { productId, variantLabel, quantity: Number(quantity) };
  });
}

function quoteFresh(body: ShippingQuoteBody) {
  if (!body.quoteId || !body.expiresAt) return false;
  const expires = Date.parse(body.expiresAt);
  return Number.isFinite(expires) && expires > Date.now();
}

export function readShippingQuote(cacheKey: string): ShippingQuoteBody | null {
  try {
    const raw = sessionStorage.getItem(SHIPPING_QUOTE_CACHE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredQuote;
    if (!stored?.cacheKey || stored.cacheKey !== cacheKey || !stored.body) return null;
    if (!quoteFresh(stored.body)) {
      sessionStorage.removeItem(SHIPPING_QUOTE_CACHE_KEY);
      return null;
    }
    return stored.body;
  } catch {
    sessionStorage.removeItem(SHIPPING_QUOTE_CACHE_KEY);
    return null;
  }
}

export function writeShippingQuote(cacheKey: string, body: ShippingQuoteBody) {
  if (!quoteFresh(body)) return;
  const stored: StoredQuote = {
    cacheKey,
    fetchedAt: new Date().toISOString(),
    body,
  };
  sessionStorage.setItem(SHIPPING_QUOTE_CACHE_KEY, JSON.stringify(stored));
}

export function clearShippingQuoteCache() {
  sessionStorage.removeItem(SHIPPING_QUOTE_CACHE_KEY);
  inflight.clear();
}

export async function prefetchShippingQuote(input: {
  postalCode: string;
  items: ShippingQuoteItem[];
  couponCode?: string | null;
  signal?: AbortSignal;
  force?: boolean;
}): Promise<ShippingQuoteBody | null> {
  const postalCode = input.postalCode.trim();
  if (!/^\d{6}$/.test(postalCode) || !input.items.length) return null;
  const cartKey = shippingQuoteCartKey(input.items);
  const cacheKey = shippingQuoteCacheKey(postalCode, cartKey, input.couponCode || "");
  if (!input.force) {
    const cached = readShippingQuote(cacheKey);
    if (cached) return cached;
    const pending = inflight.get(cacheKey);
    if (pending) return pending;
  }

  const request = (async () => {
    try {
      const response = await fetch("/api/checkout/shipping-options", {
        method: "POST",
        headers: csrfHeaders(),
        signal: input.signal,
        body: JSON.stringify({
          postalCode,
          couponCode: input.couponCode || "",
          items: input.items,
        }),
      });
      const body = await response.json() as ShippingQuoteBody;
      if (!response.ok) return body.quoteId ? body : { ...body, quoteId: body.quoteId || "", expiresAt: body.expiresAt || "" };
      if (quoteFresh(body)) writeShippingQuote(cacheKey, body);
      return body;
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") return null;
      return null;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, request);
  return request;
}
