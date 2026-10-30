/**
 * Catalog cache — Redis (REDIS_URL) with in-process L1 via src/lib/cache/redis.ts.
 * Invalidation bumps a generation counter so stale product keys expire via TTL.
 */

import { cacheDel, cacheGet, cacheGetJson, cacheIncr, cacheSetJson } from "@/lib/cache/redis";

const DEFAULT_TTL_SECONDS = 60;
const GEN_KEY = "catalog:gen";

async function catalogGen(): Promise<string> {
  const raw = await cacheGet(GEN_KEY);
  return raw == null ? "0" : raw;
}

async function versionedKey(suffix: string) {
  const gen = await catalogGen();
  return `catalog:v${gen}:${suffix}`;
}

export const CATALOG_CACHE_KEYS = {
  slim: "slim",
  fullProducts: "products-full",
  productSlug: (slug: string) => `product:${slug}`,
} as const;

/** Returns `undefined` on miss; cached `null` is a real hit. */
export async function catalogCacheGet<T>(suffix: string): Promise<T | undefined> {
  const key = await versionedKey(suffix);
  return cacheGetJson<T>(key);
}

export async function catalogCacheSet<T>(suffix: string, value: T, ttlMs = DEFAULT_TTL_SECONDS * 1000) {
  const key = await versionedKey(suffix);
  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
  await cacheSetJson(key, value, ttlSeconds);
}

export async function invalidateCatalogCache() {
  await cacheIncr(GEN_KEY);
  // Drop unversioned leftovers from older deploys, if any.
  await cacheDel("catalog:slim", "catalog:products-full");
}
