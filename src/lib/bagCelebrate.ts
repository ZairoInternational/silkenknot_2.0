export type BagCelebrateReason = "coupon" | "unlock";

type Listener = (reason: BagCelebrateReason) => void;

const listeners = new Set<Listener>();
let pending: { reason: BagCelebrateReason; until: number } | null = null;

export function queueBagCelebrate(reason: BagCelebrateReason) {
  pending = { reason, until: Date.now() + 4000 };
  listeners.forEach((listen) => listen(reason));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("silkknot-bag-celebrate", { detail: { reason } }));
  }
}

export function takePendingBagCelebrate(): BagCelebrateReason | null {
  if (!pending || Date.now() > pending.until) {
    pending = null;
    return null;
  }
  const reason = pending.reason;
  pending = null;
  return reason;
}

export function onBagCelebrate(handler: Listener) {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}
