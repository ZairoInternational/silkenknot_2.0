import { randomBytes } from "crypto";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { Db, Document } from "mongodb";
import {
  activityLabel,
  adminBannerView,
  bannerHasRequiredImage,
  isBannerPlacement,
  isBannerPubliclyEligible,
  isBannerStatus,
  normalizeBannerWrite,
  toPublicBanner,
  type BannerPlacement,
  type BannerRecord,
  type BannerStatus,
  type BannerWriteInput,
  type PublicBanner,
} from "@/lib/banners/content";
import { ensureBannerIndexes } from "@/lib/banners/indexes";
import { SITE_CACHE_KEYS, invalidateSiteCache, readThroughSiteCache } from "@/lib/cache/site";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { isManagedCdnUrl, removeFromBunny } from "@/lib/media/bunny";
import { mediaCorrelationId } from "@/lib/media/errors";
import { databaseConfigured, getDb } from "@/lib/mongo";

async function invalidateHomeBannerCache() {
  await invalidateSiteCache(SITE_CACHE_KEYS.homeBanners);
}

const BANNER_ID = /^[a-zA-Z0-9_-]{8,64}$/;
let indexesReady: Promise<void> | null = null;

export function assertBannerId(id: string) {
  if (!BANNER_ID.test(id)) throw new Error("Invalid banner id.");
}

function newBannerId() {
  return `bnr_${randomBytes(10).toString("hex")}`;
}

function stripMongo(doc: Document): BannerRecord {
  const rest = { ...doc };
  delete rest._id;
  return rest as BannerRecord;
}

async function bannersCollection() {
  const db = await getDb();
  if (!indexesReady) {
    indexesReady = ensureBannerIndexes(db).catch((error) => {
      indexesReady = null;
      throw error;
    });
  }
  await indexesReady;
  return db.collection("banners");
}

export async function ensureBannerBootstrap(db: Db) {
  await ensureBannerIndexes(db);
  await ensureFestiveGlowDraft(db);
}

/**
 * Initial Festive Glow Sale draft — never auto-published.
 * Image URLs stay empty until an admin uploads through the form.
 * Dates are kept as requested even if the window has already passed relative to "today".
 */
async function ensureFestiveGlowDraft(db: Db) {
  const existing = await db.collection("banners").findOne({ name: "Festive Glow Sale", placement: "homepage-hero" });
  if (existing) return;

  const now = new Date().toISOString();
  const draft: BannerRecord = {
    id: newBannerId(),
    name: "Festive Glow Sale",
    description: "Initial festive campaign draft — upload desktop and mobile images before publishing.",
    placement: "homepage-hero",
    image: {
      desktopUrl: "",
      mobileUrl: "",
      alt: "Festive Glow Sale — Silken Knot body care",
    },
    title: "Festive Glow Sale",
    subtitle: "Warm light for skin and home",
    promotionalText: "Shop the seasonal edit",
    supportingText: "Body care, bath, and candles for the festive window.",
    cta: {
      enabled: true,
      label: "Shop the Sale",
      href: "/collections/bestsellers",
      openInNewTab: false,
    },
    wholeBannerClickable: false,
    status: "draft",
    // 2026-11-01 00:00 IST → 2026-10-31T18:30:00.000Z
    startsAt: "2026-10-31T18:30:00.000Z",
    // 2026-11-15 23:59:59.999 IST → 2026-11-15T18:29:59.999Z
    endsAt: "2026-11-15T18:29:59.999Z",
    timezone: "Asia/Kolkata",
    priority: 10,
    categorySlug: "",
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
    updatedBy: "system",
  };
  await db.collection("banners").insertOne(draft);
}

export type ListBannersQuery = {
  placement?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  now?: Date;
};

export async function listBanners(query: ListBannersQuery = {}) {
  if (!databaseConfigured()) throw new Error("Database is not configured.");
  const collection = await bannersCollection();
  const filter: Document = {};
  if (query.placement && isBannerPlacement(query.placement)) filter.placement = query.placement;
  if (query.status && isBannerStatus(query.status)) filter.status = query.status;

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20));
  const total = await collection.countDocuments(filter);
  const rows = await collection
    .find(filter)
    .sort({ priority: -1, updatedAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  const now = query.now || new Date();
  return {
    items: rows.map((row) => adminBannerView(stripMongo(row), now)),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getBannerById(id: string, now: Date = new Date()) {
  assertBannerId(id);
  if (!databaseConfigured()) throw new Error("Database is not configured.");
  const collection = await bannersCollection();
  const row = await collection.findOne({ id });
  if (!row) return null;
  return adminBannerView(stripMongo(row), now);
}

export async function createBanner(input: BannerWriteInput, actorId: string) {
  if (!databaseConfigured()) throw new Error("Database is not configured.");
  const normalized = normalizeBannerWrite({ ...input, status: input.status ?? "draft" }, { requirePublishReady: false });
  if (!normalized.ok) throw Object.assign(new Error(normalized.error.message), { field: normalized.error.field, status: 400 });

  const now = new Date().toISOString();
  const record: BannerRecord = {
    ...(normalized.banner as Omit<BannerRecord, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">),
    id: newBannerId(),
    status: "draft",
    createdAt: now,
    updatedAt: now,
    createdBy: actorId || "admin",
    updatedBy: actorId || "admin",
  };

  // Force draft on create — publish/schedule go through explicit actions.
  record.status = "draft";

  const collection = await bannersCollection();
  await collection.insertOne({ ...record });
  await invalidateHomeBannerCache();
  return adminBannerView(record);
}

export async function updateBanner(id: string, input: BannerWriteInput, actorId: string) {
  assertBannerId(id);
  if (!databaseConfigured()) throw new Error("Database is not configured.");
  const collection = await bannersCollection();
  const existingRow = await collection.findOne({ id });
  if (!existingRow) return null;
  const existing = stripMongo(existingRow);

  // Status changes must use setBannerStatus — ignore status on general update.
  const rest = { ...input };
  delete rest.status;
  const normalized = normalizeBannerWrite(rest, {
    existing,
    requirePublishReady: existing.status === "published" || existing.status === "scheduled",
  });
  if (!normalized.ok) throw Object.assign(new Error(normalized.error.message), { field: normalized.error.field, status: 400 });

  const previousDesktop = existing.image.desktopUrl;
  const previousMobile = existing.image.mobileUrl;
  const nextImage = normalized.banner.image!;

  const updated: BannerRecord = {
    ...existing,
    ...normalized.banner,
    id: existing.id,
    status: existing.status,
    createdAt: existing.createdAt,
    createdBy: existing.createdBy,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId || "admin",
  } as BannerRecord;

  await collection.updateOne(
    { id },
    {
      $set: {
        name: updated.name,
        description: updated.description,
        placement: updated.placement,
        image: updated.image,
        title: updated.title,
        subtitle: updated.subtitle,
        promotionalText: updated.promotionalText,
        supportingText: updated.supportingText,
        cta: updated.cta,
        wholeBannerClickable: updated.wholeBannerClickable,
        startsAt: updated.startsAt,
        endsAt: updated.endsAt,
        timezone: updated.timezone,
        priority: updated.priority,
        categorySlug: updated.categorySlug,
        updatedAt: updated.updatedAt,
        updatedBy: updated.updatedBy,
      },
    },
  );

  await maybeCleanupOrphanedUrls([
    previousDesktop !== nextImage.desktopUrl ? previousDesktop : "",
    previousMobile !== nextImage.mobileUrl ? previousMobile : "",
  ], id);

  await invalidateHomeBannerCache();
  return adminBannerView(updated);
}

export async function setBannerStatus(
  id: string,
  nextStatus: BannerStatus,
  actorId: string,
  schedule?: { startsAt?: unknown; endsAt?: unknown },
) {
  assertBannerId(id);
  if (!isBannerStatus(nextStatus)) throw Object.assign(new Error("Invalid status."), { status: 400 });
  if (!databaseConfigured()) throw new Error("Database is not configured.");

  const collection = await bannersCollection();
  const existingRow = await collection.findOne({ id });
  if (!existingRow) return null;
  const existing = stripMongo(existingRow);

  const patch: BannerWriteInput = {
    startsAt: schedule?.startsAt ?? existing.startsAt,
    endsAt: schedule?.endsAt ?? existing.endsAt,
    status: nextStatus,
  };

  if (nextStatus === "published" || nextStatus === "scheduled") {
    const normalized = normalizeBannerWrite(patch, {
      existing,
      requirePublishReady: true,
    });
    if (!normalized.ok) throw Object.assign(new Error(normalized.error.message), { field: normalized.error.field, status: 400 });

    const updatedAt = new Date().toISOString();
    await collection.updateOne(
      { id },
      {
        $set: {
          status: nextStatus,
          startsAt: normalized.banner.startsAt,
          endsAt: normalized.banner.endsAt,
          updatedAt,
          updatedBy: actorId || "admin",
        },
      },
    );
    await invalidateHomeBannerCache();
    return getBannerById(id);
  }

  if (nextStatus === "draft" || nextStatus === "archived") {
    const updatedAt = new Date().toISOString();
    await collection.updateOne(
      { id },
      { $set: { status: nextStatus, updatedAt, updatedBy: actorId || "admin" } },
    );
    await invalidateHomeBannerCache();
    return getBannerById(id);
  }

  throw Object.assign(new Error("Unsupported status transition."), { status: 400 });
}

export async function reorderBanners(placement: BannerPlacement, orderedIds: string[], actorId: string) {
  if (!isBannerPlacement(placement)) throw Object.assign(new Error("Invalid placement."), { status: 400 });
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    throw Object.assign(new Error("Provide an ordered list of banner ids."), { status: 400 });
  }
  for (const id of orderedIds) assertBannerId(id);
  if (!databaseConfigured()) throw new Error("Database is not configured.");

  const collection = await bannersCollection();
  const updatedAt = new Date().toISOString();
  // Higher index = higher priority (first in list wins).
  const ops = orderedIds.map((id, index) =>
    collection.updateOne(
      { id, placement },
      { $set: { priority: orderedIds.length - index, updatedAt, updatedBy: actorId || "admin" } },
    ),
  );
  await Promise.all(ops);
  await invalidateHomeBannerCache();
  return listBanners({ placement, pageSize: 50 });
}

export async function deleteBanner(id: string, confirm: boolean) {
  assertBannerId(id);
  if (!confirm) throw Object.assign(new Error("Deletion requires explicit confirmation."), { status: 400 });
  if (!databaseConfigured()) throw new Error("Database is not configured.");

  const collection = await bannersCollection();
  const existingRow = await collection.findOne({ id });
  if (!existingRow) return null;
  const existing = stripMongo(existingRow);

  await collection.deleteOne({ id });
  await maybeCleanupOrphanedUrls([existing.image.desktopUrl, existing.image.mobileUrl], id);
  await invalidateHomeBannerCache();
  return { ok: true as const, id };
}

async function countUrlReferences(url: string, excludeId?: string) {
  if (!url || !isManagedCdnUrl(url)) return 1; // treat unmanaged as still-referenced (do not delete)
  const db = await getDb();
  const bannerFilter: Document = {
    $or: [{ "image.desktopUrl": url }, { "image.mobileUrl": url }],
  };
  if (excludeId) bannerFilter.id = { $ne: excludeId };
  const bannerCount = await db.collection("banners").countDocuments(bannerFilter, { limit: 1 });
  if (bannerCount > 0) return bannerCount;

  const productCount = await db.collection("products").countDocuments({ images: url }, { limit: 1 });
  if (productCount > 0) return productCount;

  // siteContent may reference CDN URLs in hero / site-media documents
  const siteCount = await db.collection("siteContent").countDocuments(
    {
      $or: [
        { "offer.image": url },
        { "evergreen.image": url },
        { "media.shopHero": url },
        { "media.checkoutBanner": url },
      ],
    },
    { limit: 1 },
  );
  return siteCount;
}

async function maybeCleanupOrphanedUrls(urls: string[], excludeId?: string) {
  const correlationId = mediaCorrelationId();
  for (const url of urls) {
    const trimmed = String(url || "").trim();
    if (!trimmed || !isManagedCdnUrl(trimmed)) continue;
    try {
      const refs = await countUrlReferences(trimmed, excludeId);
      if (refs > 0) continue;
      await removeFromBunny(trimmed, correlationId);
    } catch (error) {
      console.warn("[banners] orphan cleanup skipped", {
        correlationId,
        name: error instanceof Error ? error.name : "unknown",
      });
    }
  }
}

export type PublicBannersQuery = {
  placement: BannerPlacement;
  now?: Date;
  limit?: number;
};

/** Public eligibility query — timestamp window checked in application code for exact boundaries. */
export async function listPublicBanners(query: PublicBannersQuery): Promise<PublicBanner[]> {
  if (!databaseConfigured()) return [];
  if (!isBannerPlacement(query.placement)) return [];

  const now = query.now || new Date();
  const collection = await bannersCollection();
  const filter: Document = {
    placement: query.placement,
    status: { $in: ["published", "scheduled"] },
    "image.desktopUrl": { $type: "string", $ne: "" },
  };

  const rows = await collection
    .find(filter)
    .sort({ priority: -1, updatedAt: -1 })
    .limit(Math.min(20, Math.max(1, query.limit || 10)))
    .toArray();

  return rows
    .map(stripMongo)
    .filter((banner) => isBannerPubliclyEligible(banner, now))
    .map(toPublicBanner);
}

async function loadPublicBannersForHome() {
  const now = new Date();
  const [hero, strip] = await Promise.all([
    listPublicBanners({ placement: "homepage-hero", now, limit: 5 }),
    listPublicBanners({ placement: "promotional-strip", now, limit: 3 }),
  ]);
  return { hero, strip };
}

const cachedPublicBannersForHome = unstable_cache(loadPublicBannersForHome, ["site-home-banners"], {
  revalidate: 60,
  tags: [CACHE_TAGS.banners],
});

/** Request-deduped + Redis/Next cached homepage banners (eligibility snapshot ~60s). */
export const getPublicBannersForHome = cache(async () => {
  if (!databaseConfigured()) return { hero: [] as PublicBanner[], strip: [] as PublicBanner[] };
  try {
    return await readThroughSiteCache(SITE_CACHE_KEYS.homeBanners, () => cachedPublicBannersForHome());
  } catch {
    return { hero: [] as PublicBanner[], strip: [] as PublicBanner[] };
  }
});

export { activityLabel, bannerHasRequiredImage, isBannerPubliclyEligible };
