import type { Db } from "mongodb";
import {
  BRAND_CONTENT_ID,
  DEFAULT_BRAND,
  normalizeBrandSettings,
  type BrandSettings,
} from "@/lib/brand/content";
import { databaseConfigured, getDb } from "@/lib/mongo";

export async function getBrandSettings(): Promise<BrandSettings> {
  if (!databaseConfigured()) return DEFAULT_BRAND;
  try {
    const db = await getDb();
    const row = await db.collection("siteContent").findOne({ id: BRAND_CONTENT_ID });
    if (!row?.brand) return DEFAULT_BRAND;
    return normalizeBrandSettings(row.brand);
  } catch {
    return DEFAULT_BRAND;
  }
}

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
