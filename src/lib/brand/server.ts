import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { Db } from "mongodb";
import {
  BRAND_CONTENT_ID,
  DEFAULT_BRAND,
  normalizeBrandSettings,
  type BrandSettings,
} from "@/lib/brand/content";
import { SITE_CACHE_KEYS, invalidateSiteCache, readThroughSiteCache } from "@/lib/cache/site";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { databaseConfigured, getDb } from "@/lib/mongo";

async function loadBrandSettings(): Promise<BrandSettings> {
  const db = await getDb();
  const row = await db.collection("siteContent").findOne({ id: BRAND_CONTENT_ID });
  if (!row?.brand) return DEFAULT_BRAND;
  return normalizeBrandSettings(row.brand);
}

const cachedBrandSettings = unstable_cache(loadBrandSettings, ["site-brand"], {
  revalidate: 60,
  tags: [CACHE_TAGS.brand],
});

/** Request-deduped + Redis/Next cached brand settings. */
export const getBrandSettings = cache(async (): Promise<BrandSettings> => {
  if (!databaseConfigured()) return DEFAULT_BRAND;
  try {
    return await readThroughSiteCache(SITE_CACHE_KEYS.brand, () => cachedBrandSettings());
  } catch {
    return DEFAULT_BRAND;
  }
});

export async function saveBrandSettings(input: unknown): Promise<BrandSettings> {
  const brand = normalizeBrandSettings(input);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection("siteContent").updateOne(
    { id: BRAND_CONTENT_ID },
    {
      $set: {
        id: BRAND_CONTENT_ID,
        kind: "site-brand",
        brand,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  await invalidateSiteCache(SITE_CACHE_KEYS.brand);
  return brand;
}

export async function ensureBrandContent(db: Db) {
  const site = db.collection("siteContent");
  const existing = await site.findOne({ id: BRAND_CONTENT_ID });
  if (existing) return;
  const now = new Date().toISOString();
  await site.insertOne({
    id: BRAND_CONTENT_ID,
    kind: "site-brand",
    brand: DEFAULT_BRAND,
    createdAt: now,
    updatedAt: now,
  });
}
