import type { MetadataRoute } from "next";
import { journal } from "@/lib/data";
import { listCategories } from "@/lib/repository";
import { absoluteUrl } from "@/lib/seo/site";
import { listActiveProductsForSitemap } from "@/lib/seo/product";

const STATIC_PATHS: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/shop", changeFrequency: "daily", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/ingredients", changeFrequency: "monthly", priority: 0.5 },
  { path: "/journal", changeFrequency: "weekly", priority: 0.7 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.4 },
  { path: "/shipping", changeFrequency: "yearly", priority: 0.3 },
  { path: "/returns", changeFrequency: "yearly", priority: 0.3 },
  { path: "/payments", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
];

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((item) => ({
    url: absoluteUrl(item.path),
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));

  for (const category of listCategories()) {
    entries.push({
      url: absoluteUrl(`/shop?category=${encodeURIComponent(category.id)}`),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const entry of journal) {
    entries.push({
      url: absoluteUrl(`/journal/${entry.slug}`),
      lastModified: parseDate(entry.date),
      changeFrequency: "monthly",
      priority: 0.55,
    });
  }

  const products = await listActiveProductsForSitemap();
  for (const product of products) {
    entries.push({
      url: absoluteUrl(`/products/${product.slug}`),
      lastModified: parseDate(product.updatedAt) ?? parseDate(product.createdAt),
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }

  return entries;
}
