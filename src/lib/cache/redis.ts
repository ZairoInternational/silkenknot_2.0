/**
 * Shared Redis cache (REDIS_URL) with an in-process memory fallback.
 * Works with local Redis, Redis Cloud, or Upstash (redis:// / rediss:// URL).
 */

import { createClient, type RedisClientType } from "redis";

const KEY_PREFIX = "sk:";
const memory = new Map<string, { value: string; expiresAt: number }>();

type RedisClient = RedisClientType;

declare global {
  // eslint-disable-next-line no-var
  var __silkknotRedisPromise: Promise<RedisClient | null> | undefined;
}

export function redisConfigured() {
  return Boolean(process.env.REDIS_URL?.trim());
}

function namespaced(key: string) {
  return key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`;
}

function memoryGet(key: string): string | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: string, ttlSeconds: number) {
  memory.set(key, { value, expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000 });
}

function memoryDel(...keys: string[]) {
  for (const key of keys) memory.delete(key);
}

function memoryDelPrefix(prefix: string) {
  for (const key of [...memory.keys()]) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

async function getClient(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (!globalThis.__silkknotRedisPromise) {
    globalThis.__silkknotRedisPromise = (async () => {
      const client = createClient({ url }) as RedisClient;
      client.on("error", (error) => {
        console.warn("[redis] client error", { message: error instanceof Error ? error.message : "unknown" });
      });
      await client.connect();
      return client;
    })().catch((error) => {
      globalThis.__silkknotRedisPromise = undefined;
      console.warn("[redis] connect failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
      return null;
    });
  }

  return globalThis.__silkknotRedisPromise;
}

/** Raw string get. */
export async function cacheGet(key: string): Promise<string | null> {
  const full = namespaced(key);
  const local = memoryGet(full);
  if (local !== null) return local;

  const client = await getClient();
  if (!client) return null;
  try {
    const value = await client.get(full);
    if (value == null) return null;
    // Warm L1 briefly so hot paths avoid a round-trip every call.
    memorySet(full, value, 5);
    return value;
  } catch (error) {
    console.warn("[redis] get failed", { key: full, message: error instanceof Error ? error.message : "unknown" });
    return null;
  }
}

/** JSON get — `undefined` = miss (so cached `null` stays distinguishable). */
export async function cacheGetJson<T>(key: string): Promise<T | undefined> {
  const raw = await cacheGet(key);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number) {
  const full = namespaced(key);
  const ttl = Math.max(1, Math.floor(ttlSeconds));
  memorySet(full, value, ttl);

  const client = await getClient();
  if (!client) return;
  try {
    await client.set(full, value, { EX: ttl });
  } catch (error) {
    console.warn("[redis] set failed", { key: full, message: error instanceof Error ? error.message : "unknown" });
  }
}

export async function cacheSetJson(key: string, value: unknown, ttlSeconds: number) {
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
}

export async function cacheDel(...keys: string[]) {
  const fullKeys = keys.map(namespaced);
  memoryDel(...fullKeys);
  const client = await getClient();
  if (!client || !fullKeys.length) return;
  try {
    await client.del(fullKeys);
  } catch (error) {
    console.warn("[redis] del failed", { message: error instanceof Error ? error.message : "unknown" });
  }
}

/** Delete all keys under a logical prefix (SCAN on Redis; Map filter in memory). */
export async function cacheDelPrefix(prefix: string) {
  const fullPrefix = namespaced(prefix);
  memoryDelPrefix(fullPrefix);

  const client = await getClient();
  if (!client) return;
  try {
    let cursor = "0";
    do {
      const result = await client.scan(cursor, { MATCH: `${fullPrefix}*`, COUNT: 100 });
      cursor = String(result.cursor);
      if (result.keys.length) await client.del(result.keys);
    } while (cursor !== "0");
  } catch (error) {
    console.warn("[redis] delPrefix failed", {
      prefix: fullPrefix,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function cacheIncr(key: string): Promise<number> {
  const full = namespaced(key);
  const client = await getClient();
  if (client) {
    try {
      const next = await client.incr(full);
      memorySet(full, String(next), 86_400);
      return next;
    } catch (error) {
      console.warn("[redis] incr failed", { key: full, message: error instanceof Error ? error.message : "unknown" });
    }
  }
  const current = Number(memoryGet(full) || "0");
  const next = current + 1;
  memorySet(full, String(next), 86_400);
  return next;
}
