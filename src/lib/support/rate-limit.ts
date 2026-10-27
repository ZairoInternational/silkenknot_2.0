import type { Db } from "mongodb";

const WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_LIMIT = 40;

/** Mongo-backed rate limit aligned with checkout bumpRate pattern. */
export async function supportRateLimit(db: Db, keyPart: string, limit = DEFAULT_LIMIT) {
  const windowStart = Math.floor(Date.now() / WINDOW_MS);
  const key = `support:${keyPart}:${windowStart}`;
  await db.collection("rateLimits").updateOne({ key }, { $inc: { count: 1 }, $setOnInsert: { key } }, { upsert: true });
  const row = await db.collection("rateLimits").findOne({ key });
  if ((row?.count || 0) > limit) {
    return { ok: false as const, message: "Too many requests. Please wait a few minutes and try again." };
  }
  return { ok: true as const };
}
