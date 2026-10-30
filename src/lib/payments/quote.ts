import type { CartItem, Coupon, Product } from "../types";
import { couponProductIds } from "../format";
import { percentOfPaise, rupeesToPaise } from "./money";

export const FREE_SHIPPING_PAISE = 999 * 100;
export const STANDARD_SHIPPING_PAISE = 79 * 100;
const MAX_LINES = 50;
const MAX_QTY = 20;

export type QuoteLine = CartItem & { unitPaise: number; linePaise: number };

export type Quote = {
  lines: QuoteLine[];
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  platformFeePaise: number;
  amountPaise: number;
  couponCode?: string;
  delivery: "standard" | "express";
};

export type ShippingCharge = {
  method: "standard" | "express";
  chargePaise: number;
  codFeePaise?: number;
  platformFeePaise?: number;
};

export class QuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteError";
  }
}

export type DroppedCoupon = {
  code: string;
  message: string;
};

type RequestLine = { productId?: unknown; id?: unknown; variantLabel?: unknown; variant?: unknown; quantity?: unknown; qty?: unknown };

function couponDropMessage(code: string) {
  return `${code} no longer applies to the items in your bag, so it was removed.`;
}

/**
 * Prices the bag for shipping. If a coupon is present but no longer eligible
 * (e.g. its product was removed), drops it and continues instead of failing.
 */
export function quoteCartDroppingStaleCoupon(
  products: Product[],
  coupons: Coupon[],
  items: RequestLine[],
  couponCode: string,
  shipping?: ShippingCharge,
): { quote: Quote; droppedCoupon: DroppedCoupon | null } {
  const requested = couponCode.trim();
  try {
    return { quote: quoteCart(products, coupons, items, requested, shipping), droppedCoupon: null };
  } catch (error) {
    if (!(error instanceof QuoteError) || !requested) throw error;
    const quote = quoteCart(products, coupons, items, "", shipping);
    return {
      quote,
      droppedCoupon: { code: requested.toUpperCase(), message: couponDropMessage(requested.toUpperCase()) },
    };
  }
}

export function quoteCart(products: Product[], coupons: Coupon[], items: RequestLine[], couponCode: string, shipping?: ShippingCharge): Quote {
  if (!Array.isArray(items) || items.length < 1 || items.length > MAX_LINES) {
    throw new QuoteError("Invalid cart items.");
  }
  const merged = new Map<string, { productId: string; variantLabel: string; quantity: number }>();
  for (const item of items) {
    const productId = String(item.productId || item.id || "");
    const variantLabel = String(item.variantLabel || item.variant || "");
    const quantity = Number(item.quantity ?? item.qty);
    if (!productId || !variantLabel || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
      throw new QuoteError("Cart contains an invalid product or quantity.");
    }
    const key = `${productId}\u0000${variantLabel}`;
    const previous = merged.get(key);
    const next = (previous?.quantity || 0) + quantity;
    if (next > MAX_QTY) throw new QuoteError("Cart contains an invalid product or quantity.");
    merged.set(key, { productId, variantLabel, quantity: next });
  }

  const lines: QuoteLine[] = [];
  for (const line of merged.values()) {
    const product = products.find((entry) => entry.id === line.productId && entry.active !== false);
    const variant = product?.variants.find((option) => option.label === line.variantLabel);
    if (!product || !variant || !Number.isInteger(variant.price) || variant.price <= 0) {
      throw new QuoteError("Cart contains an invalid product or quantity.");
    }
    if (variant.stock < line.quantity) throw new QuoteError("Cart contains an invalid product or quantity.");
    const unitPaise = rupeesToPaise(variant.price);
    lines.push({
      id: `${product.id}:${variant.label}`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] || "",
      categoryId: product.categoryId,
      variantLabel: variant.label,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      quantity: line.quantity,
      unitPaise,
      linePaise: unitPaise * line.quantity,
    });
  }

  const subtotalPaise = lines.reduce((sum, line) => sum + line.linePaise, 0);
  const code = couponCode.trim();
  const coupon = code ? coupons.find((item) => item.active && item.code.toLowerCase() === code.toLowerCase()) : undefined;
  if (code && !coupon) throw new QuoteError("This offer doesn’t apply to your bag.");
  const discountPaise = coupon ? discountFor(lines, coupon) : 0;
  if (code && discountPaise <= 0) throw new QuoteError("This offer doesn’t apply to your bag.");
  const net = Math.max(0, subtotalPaise - discountPaise);
  const shippingPaise = shipping ? shipping.chargePaise : net >= FREE_SHIPPING_PAISE ? 0 : STANDARD_SHIPPING_PAISE;
  const codFeePaise = shipping?.codFeePaise && Number.isInteger(shipping.codFeePaise) ? shipping.codFeePaise : 0;
  const platformFeePaise = shipping?.platformFeePaise && Number.isInteger(shipping.platformFeePaise) && shipping.platformFeePaise > 0
    ? shipping.platformFeePaise
    : 0;
  if (shipping && (!Number.isInteger(shipping.chargePaise) || shipping.chargePaise < 0)) {
    throw new QuoteError("Shipping charge is invalid.");
  }
  if (shipping?.platformFeePaise != null && (!Number.isInteger(shipping.platformFeePaise) || shipping.platformFeePaise < 0)) {
    throw new QuoteError("Platform fee is invalid.");
  }
  return {
    lines,
    subtotalPaise,
    discountPaise,
    shippingPaise,
    codFeePaise,
    platformFeePaise,
    amountPaise: net + shippingPaise + codFeePaise + platformFeePaise,
    couponCode: discountPaise > 0 ? coupon?.code : undefined,
    delivery: shipping?.method || "standard",
  };
}

function eligiblePaise(lines: QuoteLine[], coupon: Coupon) {
  if (coupon.scope === "product") {
    const ids = new Set(couponProductIds(coupon));
    return lines.filter((line) => ids.has(line.productId)).reduce((sum, line) => sum + line.linePaise, 0);
  }
  if (coupon.scope === "category") {
    return lines.filter((line) => line.categoryId === coupon.categoryId).reduce((sum, line) => sum + line.linePaise, 0);
  }
  return lines.reduce((sum, line) => sum + line.linePaise, 0);
}

function discountFor(lines: QuoteLine[], coupon: Coupon) {
  const base = eligiblePaise(lines, coupon);
  if (base <= 0) return 0;
  if (coupon.type === "percent") {
    if (!Number.isInteger(coupon.value)) return 0;
    return percentOfPaise(base, coupon.value);
  }
  if (!Number.isInteger(coupon.value) || coupon.value <= 0) return 0;
  return Math.min(rupeesToPaise(coupon.value), base);
}
