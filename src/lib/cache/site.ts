import { cacheDel, cacheGetJson, cacheSetJson } from "@/lib/cache/redis";

export const SITE_CACHE_KEYS = {
  brand: "site:brand",
  siteMedia: "site:media",
  announcements: "site:announcements",
} as const;

const SITE_TTL_SECONDS = 60;

/** Redis (or memory) read-through cache for small site-content documents. */
export async function readThroughSiteCache<T>(key: string, loader: () => Promise<T>, ttlSeconds = SITE_TTL_SECONDS): Promise<T> {
  const hit = await cacheGetJson<T>(key);
  if (hit !== undefined) return hit;
  const value = await loader();
  await cacheSetJson(key, value, ttlSeconds);
  return value;
}

export async function invalidateSiteCache(...keys: string[]) {
  if (keys.length) await cacheDel(...keys);
}
