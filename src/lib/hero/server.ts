import type { Db } from "mongodb";
import {
  DEFAULT_HERO_OFFER,
  HERO_CONTENT_ID,
  normalizeHeroOffer,
  type HeroOffer,
} from "@/lib/hero/content";
import { databaseConfigured, getDb } from "@/lib/mongo";

export async function getHeroOffer(): Promise<HeroOffer> {
  if (!databaseConfigured()) return DEFAULT_HERO_OFFER;
  try {
    const db = await getDb();
    const row = await db.collection("siteContent").findOne({ id: HERO_CONTENT_ID });
    if (!row?.offer) return DEFAULT_HERO_OFFER;
    return normalizeHeroOffer(row.offer);
  } catch {
    return DEFAULT_HERO_OFFER;
  }
}

export async function saveHeroOffer(input: unknown): Promise<HeroOffer> {
  const offer = normalizeHeroOffer(input);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection("siteContent").updateOne(
    { id: HERO_CONTENT_ID },
    {
      $set: {
        id: HERO_CONTENT_ID,
        kind: "homepage-hero",
        offer,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  return offer;
}

export async function ensureHeroContent(db: Db) {
  const site = db.collection("siteContent");
  const existing = await site.findOne({ id: HERO_CONTENT_ID });
  if (existing) return;
  const now = new Date().toISOString();
  await site.insertOne({
    id: HERO_CONTENT_ID,
    kind: "homepage-hero",
    offer: DEFAULT_HERO_OFFER,
    createdAt: now,
    updatedAt: now,
  });
}
