import type { CartItem, Product } from "@/lib/types";
import type { AnalyticsItem } from "./types";

export function categoryNameFor(
  categoryId: string | undefined,
  categories: Array<{ id: string; name: string }>,
) {
  if (!categoryId) return undefined;
  return categories.find((item) => item.id === categoryId)?.name;
}

export function itemFromProduct(
  product: Pick<Product, "id" | "name" | "categoryId" | "price">,
  options: {
    price?: number;
    quantity?: number;
    variantLabel?: string;
    categoryName?: string;
  } = {},
): AnalyticsItem {
  const quantity = Math.max(1, Math.floor(options.quantity ?? 1));
  const price = Number.isFinite(options.price) ? Number(options.price) : product.price;
  const item: AnalyticsItem = {
    item_id: product.id,
    item_name: product.name,
    price,
    quantity,
  };
  const category = options.categoryName;
  if (category) item.item_category = category;
  if (options.variantLabel) item.item_variant = options.variantLabel;
  return item;
}

export function itemFromCartLine(
  line: CartItem,
  categoryName?: string,
  quantityOverride?: number,
): AnalyticsItem {
  const quantity = Math.max(1, Math.floor(quantityOverride ?? line.quantity));
  const item: AnalyticsItem = {
    item_id: line.productId,
    item_name: line.name,
    item_variant: line.variantLabel,
    price: line.price,
    quantity,
  };
  if (categoryName) item.item_category = categoryName;
  return item;
}

export function itemsFromCart(
  cart: CartItem[],
  categories: Array<{ id: string; name: string }>,
): AnalyticsItem[] {
  return cart.map((line) => itemFromCartLine(line, categoryNameFor(line.categoryId, categories)));
}

export function cartValue(items: AnalyticsItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
