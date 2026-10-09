import type { CartItem, Coupon, Product } from "@/lib/types";

export const FREE_SHIPPING_AT = 999;

export function photo(id: string, width = 960) {
  if (id.startsWith("http") || id.startsWith("/")) return repairImageUrl(id);
  const file = id.startsWith("photo-") ? id : `photo-${id}`;
  return `https://images.unsplash.com/${file}?auto=format&fit=crop&w=${width}&q=70`;
}

export function repairImageUrl(src: string) {
  if (!src.includes("images.unsplash.com/") || src.includes("images.unsplash.com/photo-")) return src;
  return src.replace("images.unsplash.com/", "images.unsplash.com/photo-");
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function discountPercent(price: number, compare?: number) {
  if (!compare || compare <= price) return 0;
  return Math.round((1 - price / compare) * 100);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function subtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function itemCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function shippingCost(amount: number, method: "standard" | "express") {
  if (method === "express") return 149;
  return amount >= FREE_SHIPPING_AT ? 0 : 79;
}

export function eligibleAmount(items: CartItem[], coupon: Coupon) {
  if (coupon.scope === "product") {
    return subtotal(items.filter((item) => item.productId === coupon.productId));
  }
  if (coupon.scope === "category") {
    return subtotal(items.filter((item) => item.categoryId === coupon.categoryId));
  }
  return subtotal(items);
}

export function couponDiscount(items: CartItem[], coupon: Coupon) {
  const base = eligibleAmount(items, coupon);
  if (base <= 0) return 0;
  if (coupon.type === "percent") return Math.round(base * (coupon.value / 100));
  return Math.min(Math.round(coupon.value), base);
}

export function withDerivedPrice(product: Product): Product {
  if (!product.variants.length) return product;
  const variant = product.variants.reduce((lowest, item) =>
    item.price < lowest.price ? item : lowest,
  );
  return {
    ...product,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
  };
}

export function categoryName(id: string) {
  if (id === "body-care") return "Body Care";
  if (id === "bath-soap") return "Bath & Soap";
  if (id === "aromatherapy") return "Aromatherapy";
  if (id === "lifestyle") return "Lifestyle";
  return id;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
