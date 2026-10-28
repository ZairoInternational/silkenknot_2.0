/** Short-window in-memory dedupe for Strict Mode double effects and rapid remounts. */
const recent = new Map<string, number>();

export function claimOnce(key: string, windowMs = 1500): boolean {
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < windowMs) return false;
  recent.set(key, now);
  // Bound memory for long sessions.
  if (recent.size > 200) {
    for (const [entry, at] of recent) {
      if (now - at > windowMs * 4) recent.delete(entry);
    }
  }
  return true;
}

/** Test helper — clears the in-memory window. */
export function resetDedupeForTests() {
  recent.clear();
}
