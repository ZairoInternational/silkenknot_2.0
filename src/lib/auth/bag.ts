import type { Db } from "mongodb";
import type { CartItem, Product } from "@/lib/types";

type Bag = { cart: CartItem[]; wishlist: string[]; couponCode: string | null };

function lineFrom(product: Product, variantLabel: string, quantity: number): CartItem | null {
  if (!product.active) return null;
  const variant = product.variants.find((option) => option.label === variantLabel);
  if (!variant || variant.stock < 1) return null;
  const next = Math.max(1, Math.min(quantity, variant.stock, 20));
  return {
    id: `${product.id}:${variant.label}`,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    image: product.images[0] || "",
    categoryId: product.categoryId,
    variantLabel: variant.label,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    quantity: next,
  };
}

export async function saveBag(db: Db, userId: string, guest: Partial<Bag>): Promise<Bag> {
  return writeBag(db, userId, guest, false);
}

export async function mergeBag(db: Db, userId: string, guest: Partial<Bag>): Promise<Bag> {
  return writeBag(db, userId, guest, true);
}

async function writeBag(db: Db, userId: string, guest: Partial<Bag>, merge: boolean): Promise<Bag> {
  const users = db.collection("users");
  const account = await users.findOne({ id: userId });
  const savedCart = merge && Array.isArray(account?.savedCart) ? (account.savedCart as CartItem[]) : [];
  const savedWishlist = merge && Array.isArray(account?.savedWishlist) ? (account.savedWishlist as string[]) : [];
  const incoming = Array.isArray(guest.cart) ? guest.cart : [];
  const wishedIncoming = Array.isArray(guest.wishlist) ? guest.wishlist.map(String) : [];
  const ids = [...new Set([
    ...savedCart.map((item) => String(item.productId || "")),
    ...incoming.map((item) => String(item.productId || "")),
    ...savedWishlist,
    ...wishedIncoming,
  ])].filter(Boolean);
  const products = ids.length
    ? ((await db.collection("products").find({ id: { $in: ids } }).toArray()) as unknown as Product[])
    : [];
  const byId = new Map(products.map((product) => [product.id, product]));
  const merged = new Map<string, CartItem>();
  for (const source of [savedCart, incoming]) {
    for (const item of source) {
      const product = byId.get(String(item.productId || ""));
      if (!product) continue;
      const existing = merged.get(`${product.id}:${item.variantLabel}`);
      const quantity = (existing?.quantity ?? 0) + Number(item.quantity || 0);
      const line = lineFrom(product, String(item.variantLabel || ""), quantity);
      if (line) merged.set(line.id, line);
    }
  }
  const activeIds = new Set(products.filter((product) => product.active).map((product) => product.id));
  const wished = [...savedWishlist, ...wishedIncoming]
    .map((id) => String(id))
    .filter((id, index, all) => id && activeIds.has(id) && all.indexOf(id) === index);
  const couponCode = typeof guest.couponCode === "string" && guest.couponCode
    ? guest.couponCode
    : (typeof account?.savedCoupon === "string" ? account.savedCoupon : null);
  const bag = { cart: [...merged.values()], wishlist: wished, couponCode };
  await users.updateOne({ id: userId }, { $set: { savedCart: bag.cart, savedWishlist: bag.wishlist, savedCoupon: bag.couponCode } });
  return bag;
}

export async function readBag(db: Db, userId: string): Promise<Bag> {
  const account = await db.collection("users").findOne({ id: userId });
  return {
    cart: Array.isArray(account?.savedCart) ? (account.savedCart as CartItem[]) : [],
    wishlist: Array.isArray(account?.savedWishlist) ? (account.savedWishlist as string[]) : [],
    couponCode: typeof account?.savedCoupon === "string" ? account.savedCoupon : null,
  };
}
