import type { Metadata } from "next";
import { cache } from "react";
import { findProduct, listCategories } from "@/lib/repository";
import { databaseConfigured, getDb } from "@/lib/mongo";
import type { Category, Product, Review } from "@/lib/types";
import { absoluteAssetUrl, absoluteUrl } from "@/lib/seo/site";
import { buildPageMetadata, truncateMeta } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, productJsonLd, type JsonLd, type JsonLdNode } from "@/lib/seo/jsonLd";
import { photo } from "@/lib/format";

function stripMongoId<T extends Record<string, unknown>>(doc: T): Omit<T, "_id"> {
  const rest = { ...doc };
  delete rest._id;
  return rest;
}

/** Deduped per request so metadata + page share one Mongo read. */
export const getActiveProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const normalized = slug.trim();
  if (!normalized) return null;

  if (databaseConfigured()) {
    try {
      const db = await getDb();
      const row = await db.collection("products").findOne({ slug: normalized, active: true });
      if (!row) return null;
      return stripMongoId(row as Record<string, unknown>) as unknown as Product;
    } catch {
      // Fall through to seed catalog when Mongo is unreachable during build/dev.
    }
  }
  return findProduct(normalized) ?? null;
});

/** Lightweight fields for sitemap generation. */
export type SitemapProductRow = {
  slug: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function listActiveProductsForSitemap(): Promise<SitemapProductRow[]> {
  if (databaseConfigured()) {
    try {
      const db = await getDb();
      const rows = await db
        .collection("products")
        .find(
          { active: true },
          { projection: { slug: 1, createdAt: 1, updatedAt: 1, _id: 0 } },
        )
        .toArray();
      return rows
        .map((row) => ({
          slug: typeof row.slug === "string" ? row.slug : "",
          createdAt: typeof row.createdAt === "string" ? row.createdAt : undefined,
          updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : undefined,
        }))
        .filter((row) => row.slug);
    } catch {
      // Fall through
    }
  }
  const { listProducts } = await import("@/lib/repository");
  return listProducts().map((product) => ({
    slug: product.slug,
    createdAt: product.createdAt,
  }));
}

export const getCategoryById = cache(async (categoryId: string): Promise<Category | undefined> => {
  if (databaseConfigured()) {
    try {
      const db = await getDb();
      const row = await db.collection("categories").findOne({
        $or: [{ id: categoryId }, { slug: categoryId }],
      });
      if (row) return stripMongoId(row as Record<string, unknown>) as unknown as Category;
    } catch {
      // Fall through
    }
  }
  return listCategories().find((category) => category.id === categoryId);
});

/** In stock when any variant has stock > 0, or when there are no variants and product is active. */
export function productAvailability(product: Product): "InStock" | "OutOfStock" {
  if (!product.variants?.length) return "InStock";
  const total = product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stock ?? 0), 0);
  return total > 0 ? "InStock" : "OutOfStock";
}

export function productMetaDescription(product: Product) {
  const base = product.shortDescription?.trim() || product.description?.trim() || "";
  if (base) return truncateMeta(base);
  return truncateMeta(`${product.name} from Silken Knot. ${product.type} for everyday rituals.`);
}

export function buildProductMetadata(product: Product): Metadata {
  const image = product.images?.[0] ? photo(product.images[0], 1200) : undefined;
  return buildPageMetadata({
    title: product.name,
    description: productMetaDescription(product),
    path: `/products/${product.slug}`,
    image,
    index: true,
  });
}

function eligibleReviews(product: Product): Review[] {
  return (product.reviews ?? []).filter(
    (review) =>
      review &&
      typeof review.rating === "number" &&
      review.rating >= 1 &&
      review.rating <= 5 &&
      Boolean(review.body?.trim()) &&
      Boolean(review.name?.trim()),
  );
}

export function buildProductJsonLd(product: Product, categoryName?: string): JsonLd {
  const url = absoluteUrl(`/products/${product.slug}`);
  const images = (product.images?.length ? product.images : ["/silknknot/body_butter.jpg"])
    .map((src) => absoluteAssetUrl(photo(src, 1200)))
    .filter((src): src is string => Boolean(src));

  const reviews = eligibleReviews(product);
  const reviewCount = product.reviewCount > 0 ? product.reviewCount : reviews.length;
  const ratingValue = product.rating > 0 ? product.rating : reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const productNode = productJsonLd({
    name: product.name,
    description: productMetaDescription(product),
    url,
    imageUrls: images,
    brandName: "Silken Knot",
    sku: product.id,
    offer: {
      price: product.price,
      currency: "INR",
      url,
      availability: productAvailability(product),
      sku: product.id,
    },
    aggregateRating:
      reviewCount > 0 && ratingValue > 0
        ? { ratingValue, reviewCount }
        : undefined,
    reviews: reviews.map((review) => ({
      authorName: review.name,
      rating: review.rating,
      body: review.body,
      datePublished: review.date,
      title: review.title,
    })),
  });

  const crumbs = [
    { name: "Home", url: absoluteUrl("/") },
    { name: "Shop", url: absoluteUrl("/shop") },
  ];
  if (categoryName && product.categoryId) {
    crumbs.push({
      name: categoryName,
      url: absoluteUrl(`/shop?category=${encodeURIComponent(product.categoryId)}`),
    });
  }
  crumbs.push({ name: product.name, url });

  return [productNode as JsonLdNode, breadcrumbJsonLd(crumbs) as JsonLdNode];
}
