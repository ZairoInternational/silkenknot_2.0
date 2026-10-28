/**
 * Durable client-side purchase dedupe keyed by stable order id.
 * Survives refresh/revisit better than React state. Not a substitute for
 * server-side Measurement Protocol dedupe if you need cross-device guarantees.
 */

import { browserWindow } from "./browser";

export const PURCHASE_DEDUPE_KEY = "silkknot.analytics.purchases";
const MAX_IDS = 100;

function storage() {
  return browserWindow()?.localStorage;
}

function readIds(): string[] {
  const local = storage();
  if (!local) return [];
  try {
    const raw = local.getItem(PURCHASE_DEDUPE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  const local = storage();
  if (!local) return;
  try {
    local.setItem(PURCHASE_DEDUPE_KEY, JSON.stringify(ids.slice(-MAX_IDS)));
  } catch {
    /* ignore quota / private mode */
  }
}

export function hasTrackedPurchase(transactionId: string) {
  if (!transactionId) return true;
  return readIds().includes(transactionId);
}

/** Returns true if this id was newly claimed (caller should send the event). */
export function claimPurchaseTracking(transactionId: string): boolean {
  if (!transactionId) return false;
  const ids = readIds();
  if (ids.includes(transactionId)) return false;
  writeIds([...ids, transactionId]);
  return true;
}

/** Test helper. */
export function resetPurchaseDedupeForTests() {
  try {
    storage()?.removeItem(PURCHASE_DEDUPE_KEY);
  } catch {
    /* ignore */
  }
}
