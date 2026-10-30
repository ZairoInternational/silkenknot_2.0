import type { Db, Document } from "mongodb";
import {
  CATALOG_CACHE_KEYS,
  catalogCacheGet,
  catalogCacheSet,
  invalidateCatalogCache,
} from "@/lib/catalog/cache";
import type { Category, Coupon, Product } from "@/lib/types";

export { invalidateCatalogCache };

/** Storefront hydrate: listing + PDP text, no embedded reviews. */
export const STOREFRONT_PRODUCT_PROJECT: Document = {
  _id: 0,
  id: 1,
  slug: 1,
  name: 1,
  categoryId: 1,
  type: 1,
  scent: 1,
  price: 1,
  compareAtPrice: 1,
  rating: 1,
  reviewCount: 1,
  shortDescription: 1,
  description: 1,
  benefits: 1,
  ingredients: 1,
  howToUse: 1,
  showDescription: 1,
  showIngredients: 1,
  showHowToUse: 1,
  showBenefits: 1,
  images: 1,
  variants: 1,
  featured: 1,
  bestseller: 1,
  newArrival: 1,
  active: 1,
  createdAt: 1,
  weightGrams: 1,
  faqs: 1,
};

function cleanDoc<T>(doc: T): T {
  if (!doc || typeof doc !== "object") return doc;
  const copy = { ...(doc as Record<string, unknown>) };
  delete copy._id;
  delete copy.passwordHash;
  return copy as T;
}

export type SlimCatalog = {
  products: Product[];
  categories: Category[];
  coupons: Coupon[];
};

async function loadSlimCatalog(db: Db): Promise<SlimCatalog> {
  const [products, categories, coupons] = await Promise.all([
    db.collection("products").find({}, { projection: STOREFRONT_PRODUCT_PROJECT }).toArray(),
    db.collection("categories").find().sort({ order: 1 }).toArray(),
    db.collection("coupons").find({ active: true }).toArray(),
  ]);
  return {
    products: products.map((item) => {
      const product = cleanDoc(item) as unknown as Product;
      if (!Array.isArray(product.reviews)) product.reviews = [];
      return product;
    }),
    categories: categories.map((item) => cleanDoc(item) as unknown as Category),
    coupons: coupons.map((item) => cleanDoc(item) as unknown as Coupon),
  };
}

export async function getSlimCatalog(db: Db): Promise<SlimCatalog> {
  const hit = await catalogCacheGet<SlimCatalog>(CATALOG_CACHE_KEYS.slim);
  if (hit !== undefined) return hit;
  const next = await loadSlimCatalog(db);
  await catalogCacheSet(CATALOG_CACHE_KEYS.slim, next);
  return next;
}

export async function getFullProducts(db: Db): Promise<Product[]> {
  const hit = await catalogCacheGet<Product[]>(CATALOG_CACHE_KEYS.fullProducts);
  if (hit !== undefined) return hit;
  const rows = await db.collection("products").find().toArray();
  const products = rows.map((item) => cleanDoc(item) as unknown as Product);
  await catalogCacheSet(CATALOG_CACHE_KEYS.fullProducts, products, 30_000);
  return products;
}

export async function getFullProductBySlug(db: Db, slug: string): Promise<Product | null> {
  const key = CATALOG_CACHE_KEYS.productSlug(slug);
  const hit = await catalogCacheGet<Product | null>(key);
  if (hit !== undefined) return hit;
  const row = await db.collection("products").findOne({ slug, active: true });
  if (!row) {
    await catalogCacheSet(key, null, 15_000);
    return null;
  }
  const product = cleanDoc(row) as unknown as Product;
  await catalogCacheSet(key, product, 30_000);
  return product;
}
