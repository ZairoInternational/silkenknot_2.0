import type { Db } from "mongodb";
import {
  ANNOUNCEMENTS_CONTENT_ID,
  DEFAULT_ANNOUNCEMENTS,
  normalizeAnnouncements,
  publicAnnouncements,
  type AnnouncementSettings,
} from "@/lib/announcements/content";
import { databaseConfigured, getDb } from "@/lib/mongo";

export async function getAnnouncementSettings(): Promise<AnnouncementSettings> {
  if (!databaseConfigured()) return DEFAULT_ANNOUNCEMENTS;
  try {
    const db = await getDb();
    const row = await db.collection("siteContent").findOne({ id: ANNOUNCEMENTS_CONTENT_ID });
    if (!row?.announcements) return DEFAULT_ANNOUNCEMENTS;
    return normalizeAnnouncements(row.announcements);
  } catch {
    return DEFAULT_ANNOUNCEMENTS;
  }
}

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
