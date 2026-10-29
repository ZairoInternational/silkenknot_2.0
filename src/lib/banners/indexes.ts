import type { Db } from "mongodb";

async function ensure(
  db: Db,
  keys: Record<string, 1 | -1>,
  options: { name: string; unique?: boolean },
) {
  try {
    await db.collection("banners").createIndex(keys, options);
  } catch (error) {
    console.warn("[banners] index_failed", {
      name: options.name,
      code: (error as { code?: number }).code || 0,
    });
  }
}

/** Create banner indexes once during DB bootstrap — not on every public request. */
export async function ensureBannerIndexes(db: Db) {
  await ensure(db, { id: 1 }, { name: "banners_id", unique: true });
  await ensure(db, { placement: 1, status: 1, priority: -1 }, { name: "banners_placement_status_priority" });
  await ensure(db, { status: 1, startsAt: 1, endsAt: 1 }, { name: "banners_schedule" });
  await ensure(db, { placement: 1, priority: -1, updatedAt: -1 }, { name: "banners_placement_priority" });
  await ensure(db, { "image.desktopUrl": 1 }, { name: "banners_desktop_url" });
  await ensure(db, { "image.mobileUrl": 1 }, { name: "banners_mobile_url" });
}
