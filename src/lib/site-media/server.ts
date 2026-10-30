import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { Db } from "mongodb";
import {
  DEFAULT_SITE_MEDIA,
  SITE_MEDIA_CONTENT_ID,
  normalizeSiteMedia,
  type SiteMediaSettings,
} from "@/lib/site-media/content";
import { SITE_CACHE_KEYS, invalidateSiteCache, readThroughSiteCache } from "@/lib/cache/site";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { databaseConfigured, getDb } from "@/lib/mongo";

async function loadSiteMedia(): Promise<SiteMediaSettings> {
  const db = await getDb();
  const row = await db.collection("siteContent").findOne({ id: SITE_MEDIA_CONTENT_ID });
  if (!row?.media) return DEFAULT_SITE_MEDIA;
  return normalizeSiteMedia(row.media);
}

const cachedSiteMedia = unstable_cache(loadSiteMedia, ["site-media"], {
  revalidate: 60,
  tags: [CACHE_TAGS.siteMedia],
});

export const getSiteMedia = cache(async (): Promise<SiteMediaSettings> => {
  if (!databaseConfigured()) return DEFAULT_SITE_MEDIA;
  try {
    return await readThroughSiteCache(SITE_CACHE_KEYS.siteMedia, () => cachedSiteMedia());
  } catch {
    return DEFAULT_SITE_MEDIA;
  }
});

export async function saveSiteMedia(input: unknown): Promise<SiteMediaSettings> {
  const media = normalizeSiteMedia(input);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection("siteContent").updateOne(
    { id: SITE_MEDIA_CONTENT_ID },
    {
      $set: {
        id: SITE_MEDIA_CONTENT_ID,
        kind: "site-media",
        media,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  await invalidateSiteCache(SITE_CACHE_KEYS.siteMedia);
  return media;
}

export async function ensureSiteMediaContent(db: Db) {
  const site = db.collection("siteContent");
  const existing = await site.findOne({ id: SITE_MEDIA_CONTENT_ID });
  if (existing) return;
  const now = new Date().toISOString();
  await site.insertOne({
    id: SITE_MEDIA_CONTENT_ID,
    kind: "site-media",
    media: DEFAULT_SITE_MEDIA,
    createdAt: now,
    updatedAt: now,
  });
}
