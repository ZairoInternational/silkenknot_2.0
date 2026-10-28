import type { Db } from "mongodb";
import {
  DEFAULT_SITE_MEDIA,
  SITE_MEDIA_CONTENT_ID,
  normalizeSiteMedia,
  type SiteMediaSettings,
} from "@/lib/site-media/content";
import { databaseConfigured, getDb } from "@/lib/mongo";

export async function getSiteMedia(): Promise<SiteMediaSettings> {
  if (!databaseConfigured()) return DEFAULT_SITE_MEDIA;
  try {
    const db = await getDb();
    const row = await db.collection("siteContent").findOne({ id: SITE_MEDIA_CONTENT_ID });
    if (!row?.media) return DEFAULT_SITE_MEDIA;
    return normalizeSiteMedia(row.media);
  } catch {
    return DEFAULT_SITE_MEDIA;
  }
}

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
