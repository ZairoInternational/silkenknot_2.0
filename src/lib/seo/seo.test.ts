/**
 * SEO unit tests — Node.js built-in test runner (node:test + tsx)
 *
 * Run: npm test
 *   or: npx tsx --test src/lib/seo/seo.test.ts
 */

import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  absoluteAssetUrl,
  absoluteUrl,
  getSiteOrigin,
  hasConfiguredSiteUrl,
} from "./site";
import {
  serializeJsonLd,
  productJsonLd,
  breadcrumbJsonLd,
  faqPageJsonLd,
} from "./jsonLd";
import {
  buildPageMetadata,
  buildRootMetadata,
  shopMetadataFromSearchParams,
  truncateMeta,
  noIndexRobots,
} from "./metadata";
import { productAvailability, productMetaDescription, buildProductMetadata } from "./product";
import type { Product } from "@/lib/types";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.SITE_URL;
  getSiteOrigin.warned = false;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function sampleProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "silk-veil-body-butter",
    slug: "silk-veil-body-butter",
    name: "Silk Veil Body Butter",
    categoryId: "body-care",
    type: "Body Butter",
    scent: "Sandalwood",
    price: 1490,
    compareAtPrice: 1790,
    rating: 4.8,
    reviewCount: 12,
    shortDescription: "A quiet body butter for after the bath.",
    description: "Full description of the body butter.",
    benefits: ["Softens"],
    ingredients: ["Shea"],
    howToUse: ["Apply after bathing"],
    images: ["/silknknot/body_butter.jpg"],
    variants: [
      { id: "v1", label: "200g", price: 1490, stock: 8 },
    ],
    featured: true,
    bestseller: true,
    newArrival: false,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    reviews: [
      {
        id: "r1",
        name: "Asha",
        rating: 5,
        title: "Lovely",
        body: "Softens without greasiness.",
        date: "2026-02-01",
      },
    ],
    faqs: [],
    ...overrides,
  };
}

test("getSiteOrigin prefers NEXT_PUBLIC_SITE_URL and strips trailing slash", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.example.com/";
  assert.equal(getSiteOrigin(), "https://www.example.com");
  assert.equal(hasConfiguredSiteUrl(), true);
});

test("getSiteOrigin falls back to SITE_URL then localhost", () => {
  process.env.SITE_URL = "https://shop.example.in";
  assert.equal(getSiteOrigin(), "https://shop.example.in");
  delete process.env.SITE_URL;
  assert.equal(getSiteOrigin(), "http://localhost:3000");
  assert.equal(hasConfiguredSiteUrl(), false);
});

test("absoluteUrl and absoluteAssetUrl resolve paths", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.example.com";
  assert.equal(absoluteUrl("/shop"), "https://www.example.com/shop");
  assert.equal(absoluteUrl("/"), "https://www.example.com/");
  assert.equal(absoluteAssetUrl("/logo.png"), "https://www.example.com/logo.png");
  assert.equal(absoluteAssetUrl("https://cdn.example/a.webp"), "https://cdn.example/a.webp");
  assert.equal(absoluteAssetUrl(""), undefined);
});

test("serializeJsonLd escapes script breakouts", () => {
  const html = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
  assert.equal(html.includes("</script>"), false);
  assert.ok(html.includes("\\u003c"));
  assert.ok(html.includes("\\u003e"));
});

test("productJsonLd includes INR offer and stock from availability", () => {
  const node = productJsonLd({
    name: "Silk Veil Body Butter",
    description: "A quiet body butter.",
    url: "https://www.example.com/products/silk-veil-body-butter",
    imageUrls: ["https://www.example.com/a.jpg"],
    brandName: "Silken Knot",
    sku: "silk-veil-body-butter",
    offer: {
      price: 1490,
      url: "https://www.example.com/products/silk-veil-body-butter",
      availability: "InStock",
    },
    aggregateRating: { ratingValue: 4.8, reviewCount: 12 },
  });
  const offer = node.offers as Record<string, unknown>;
  assert.equal(offer.priceCurrency, "INR");
  assert.equal(offer.price, "1490.00");
  assert.equal(offer.availability, "https://schema.org/InStock");
  assert.ok(node.aggregateRating);
});

test("productJsonLd omits aggregateRating when no reviews", () => {
  const node = productJsonLd({
    name: "Test",
    description: "Desc",
    url: "https://www.example.com/products/test",
    imageUrls: ["https://www.example.com/a.jpg"],
    brandName: "Silken Knot",
    offer: {
      price: 100,
      url: "https://www.example.com/products/test",
      availability: "OutOfStock",
    },
  });
  assert.equal(node.aggregateRating, undefined);
  assert.equal((node.offers as Record<string, unknown>).availability, "https://schema.org/OutOfStock");
});

test("breadcrumbJsonLd positions items", () => {
  const node = breadcrumbJsonLd([
    { name: "Home", url: "https://www.example.com/" },
    { name: "Shop", url: "https://www.example.com/shop" },
  ]);
  const items = node.itemListElement as Array<Record<string, unknown>>;
  assert.equal(items[0].position, 1);
  assert.equal(items[1].position, 2);
});

test("faqPageJsonLd maps questions", () => {
  const node = faqPageJsonLd([{ question: "Q?", answer: "A." }]);
  const main = node.mainEntity as Array<Record<string, unknown>>;
  assert.equal(main.length, 1);
  assert.equal(main[0]["@type"], "Question");
});

test("truncateMeta and buildPageMetadata set canonical", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.example.com";
  assert.ok(truncateMeta("a ".repeat(200)).endsWith("…"));
  const meta = buildPageMetadata({
    title: "About",
    description: "Our story",
    path: "/about",
  });
  assert.equal(meta.alternates?.canonical, "https://www.example.com/about");
  assert.equal((meta.robots as { index?: boolean }).index, true);
});

test("noIndexRobots blocks indexing", () => {
  const robots = noIndexRobots() as { index: boolean; follow: boolean };
  assert.equal(robots.index, false);
  assert.equal(robots.follow, false);
});

test("shopMetadataFromSearchParams indexes category and noindexes search", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.example.com";
  const category = shopMetadataFromSearchParams({ category: "body-care" });
  assert.equal(category.alternates?.canonical, "https://www.example.com/shop?category=body-care");
  assert.equal((category.robots as { index?: boolean }).index, true);

  const search = shopMetadataFromSearchParams({ q: "butter" });
  assert.equal((search.robots as { index?: boolean }).index, false);
  assert.equal(search.alternates?.canonical, "https://www.example.com/shop");

  const page2 = shopMetadataFromSearchParams({ page: "2" });
  assert.equal((page2.robots as { index?: boolean }).index, false);
});

test("buildRootMetadata sets metadataBase", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.example.com";
  const root = buildRootMetadata({ iconUrl: "/logo.png" });
  assert.equal(String(root.metadataBase), "https://www.example.com/");
});

test("productAvailability uses variant stock, not active flag alone", () => {
  assert.equal(productAvailability(sampleProduct()), "InStock");
  assert.equal(
    productAvailability(sampleProduct({ variants: [{ id: "v1", label: "200g", price: 1490, stock: 0 }] })),
    "OutOfStock",
  );
});

test("buildProductMetadata uses product fields and canonical path", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.example.com";
  const product = sampleProduct();
  const meta = buildProductMetadata(product);
  assert.equal(meta.title, "Silk Veil Body Butter");
  assert.equal(meta.alternates?.canonical, "https://www.example.com/products/silk-veil-body-butter");
  assert.ok(String(meta.description).includes("quiet body butter"));
  assert.equal(productMetaDescription(sampleProduct({ shortDescription: "" })).length > 10, true);
});
