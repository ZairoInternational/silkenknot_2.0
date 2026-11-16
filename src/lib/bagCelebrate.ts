export type BagCelebrateReason = "coupon" | "unlock";

type Listener = (reason: BagCelebrateReason) => void;

const listeners = new Set<Listener>();

/** Fire a one-shot celebrate for mounted listeners. Does not persist across refresh. */
export function queueBagCelebrate(reason: BagCelebrateReason) {
  listeners.forEach((listen) => listen(reason));
}

export function onBagCelebrate(handler: Listener) {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}
