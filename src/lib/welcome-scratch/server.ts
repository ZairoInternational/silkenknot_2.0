import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { Db } from "mongodb";
import {
  DEFAULT_WELCOME_SCRATCH,
  WELCOME_SCRATCH_CONTENT_ID,
  normalizeWelcomeScratch,
  publicWelcomeScratch,
  type WelcomeScratchSettings,
} from "@/lib/welcome-scratch/content";
import { SITE_CACHE_KEYS, invalidateSiteCache, readThroughSiteCache } from "@/lib/cache/site";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { databaseConfigured, getDb } from "@/lib/mongo";

async function loadWelcomeScratchSettings(): Promise<WelcomeScratchSettings> {
  const db = await getDb();
  const row = await db.collection("siteContent").findOne({ id: WELCOME_SCRATCH_CONTENT_ID });
  if (!row?.welcomeScratch) return DEFAULT_WELCOME_SCRATCH;
  return normalizeWelcomeScratch(row.welcomeScratch);
}

const cachedWelcomeScratchSettings = unstable_cache(loadWelcomeScratchSettings, ["welcome-scratch"], {
  revalidate: 60,
  tags: [CACHE_TAGS.welcomeScratch],
});

export const getWelcomeScratchSettings = cache(async (): Promise<WelcomeScratchSettings> => {
  if (!databaseConfigured()) return DEFAULT_WELCOME_SCRATCH;
  try {
    return await readThroughSiteCache(SITE_CACHE_KEYS.welcomeScratch, () => cachedWelcomeScratchSettings());
  } catch {
    return DEFAULT_WELCOME_SCRATCH;
  }
});

export async function getPublicWelcomeScratch() {
  return publicWelcomeScratch(await getWelcomeScratchSettings());
}

export async function saveWelcomeScratchSettings(input: unknown): Promise<WelcomeScratchSettings> {
  const welcomeScratch = normalizeWelcomeScratch(input);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection("siteContent").updateOne(
    { id: WELCOME_SCRATCH_CONTENT_ID },
    {
      $set: {
        id: WELCOME_SCRATCH_CONTENT_ID,
        kind: "welcome-scratch",
        welcomeScratch,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  await invalidateSiteCache(SITE_CACHE_KEYS.welcomeScratch);
  return welcomeScratch;
}

export async function ensureWelcomeScratchContent(db: Db) {
  const site = db.collection("siteContent");
  const existing = await site.findOne({ id: WELCOME_SCRATCH_CONTENT_ID });
  if (existing) return;
  const now = new Date().toISOString();
  await site.insertOne({
    id: WELCOME_SCRATCH_CONTENT_ID,
    kind: "welcome-scratch",
    welcomeScratch: DEFAULT_WELCOME_SCRATCH,
    createdAt: now,
    updatedAt: now,
  });
}
