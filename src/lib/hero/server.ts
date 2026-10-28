import type { Db } from "mongodb";
import {
  DEFAULT_HERO_CONTENT,
  DEFAULT_HERO_OFFER,
  HERO_CONTENT_ID,
  normalizeHeroContent,
  normalizeHeroOffer,
  type HeroContent,
  type HeroOffer,
} from "@/lib/hero/content";
import { databaseConfigured, getDb } from "@/lib/mongo";

export async function getHeroContent(): Promise<HeroContent> {
  if (!databaseConfigured()) return DEFAULT_HERO_CONTENT;
  try {
    const db = await getDb();
    const row = await db.collection("siteContent").findOne({ id: HERO_CONTENT_ID });
    if (!row) return DEFAULT_HERO_CONTENT;
    return normalizeHeroContent({
      offer: row.offer,
      evergreen: row.evergreen,
      ...(row.offer ? {} : row),
    });
  } catch {
    return DEFAULT_HERO_CONTENT;
  }
}

export async function getHeroOffer(): Promise<HeroOffer> {
  const content = await getHeroContent();
  return content.offer;
}

export async function saveHeroContent(input: unknown): Promise<HeroContent> {
  const content = normalizeHeroContent(input);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection("siteContent").updateOne(
    { id: HERO_CONTENT_ID },
    {
      $set: {
        id: HERO_CONTENT_ID,
        kind: "homepage-hero",
        offer: content.offer,
        evergreen: content.evergreen,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  return content;
}

/** @deprecated Prefer saveHeroContent — kept for older callers that only send the offer. */
export async function saveHeroOffer(input: unknown): Promise<HeroOffer> {
  const existing = await getHeroContent();
  const saved = await saveHeroContent({ offer: normalizeHeroOffer(input), evergreen: existing.evergreen });
  return saved.offer;
}

export async function ensureHeroContent(db: Db) {
  const site = db.collection("siteContent");
  const existing = await site.findOne({ id: HERO_CONTENT_ID });
  if (existing) {
    if (!Array.isArray(existing.evergreen) || !existing.evergreen.length) {
      await site.updateOne(
        { id: HERO_CONTENT_ID },
        { $set: { evergreen: DEFAULT_HERO_CONTENT.evergreen, updatedAt: new Date().toISOString() } },
      );
    }
    return;
  }
  const now = new Date().toISOString();
  await site.insertOne({
    id: HERO_CONTENT_ID,
    kind: "homepage-hero",
    offer: DEFAULT_HERO_OFFER,
    evergreen: DEFAULT_HERO_CONTENT.evergreen,
    createdAt: now,
    updatedAt: now,
  });
}
