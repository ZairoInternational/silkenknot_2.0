import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { Db } from "mongodb";
import {
  ANNOUNCEMENTS_CONTENT_ID,
  DEFAULT_ANNOUNCEMENTS,
  normalizeAnnouncements,
  publicAnnouncements,
  type AnnouncementSettings,
} from "@/lib/announcements/content";
import { SITE_CACHE_KEYS, invalidateSiteCache, readThroughSiteCache } from "@/lib/cache/site";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { databaseConfigured, getDb } from "@/lib/mongo";

async function loadAnnouncementSettings(): Promise<AnnouncementSettings> {
  const db = await getDb();
  const row = await db.collection("siteContent").findOne({ id: ANNOUNCEMENTS_CONTENT_ID });
  if (!row?.announcements) return DEFAULT_ANNOUNCEMENTS;
  return normalizeAnnouncements(row.announcements);
}

const cachedAnnouncementSettings = unstable_cache(loadAnnouncementSettings, ["site-announcements"], {
  revalidate: 60,
  tags: [CACHE_TAGS.announcements],
});

export const getAnnouncementSettings = cache(async (): Promise<AnnouncementSettings> => {
  if (!databaseConfigured()) return DEFAULT_ANNOUNCEMENTS;
  try {
    return await readThroughSiteCache(SITE_CACHE_KEYS.announcements, () => cachedAnnouncementSettings());
  } catch {
    return DEFAULT_ANNOUNCEMENTS;
  }
});

export async function getPublicAnnouncements() {
  return publicAnnouncements(await getAnnouncementSettings());
}

export async function saveAnnouncementSettings(input: unknown): Promise<AnnouncementSettings> {
  const announcements = normalizeAnnouncements(input);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection("siteContent").updateOne(
    { id: ANNOUNCEMENTS_CONTENT_ID },
    {
      $set: {
        id: ANNOUNCEMENTS_CONTENT_ID,
        kind: "site-announcements",
        announcements,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  await invalidateSiteCache(SITE_CACHE_KEYS.announcements);
  return announcements;
}

export async function ensureAnnouncementContent(db: Db) {
  const site = db.collection("siteContent");
  const existing = await site.findOne({ id: ANNOUNCEMENTS_CONTENT_ID });
  if (existing) return;
  const now = new Date().toISOString();
  await site.insertOne({
    id: ANNOUNCEMENTS_CONTENT_ID,
    kind: "site-announcements",
    announcements: DEFAULT_ANNOUNCEMENTS,
    createdAt: now,
    updatedAt: now,
  });
}
