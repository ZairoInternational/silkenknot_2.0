import type { ShippingPolicy } from "@/lib/shipping/policy";

/** Fallback when policy has not loaded yet (matches env default in policy.ts). */
export const DEFAULT_FREE_SHIPPING_PAISE = 99900;

export type ShippingDisplay = {
  freeShippingPaise: number;
  /** Rupees, for UI copy and progress bars. */
  freeShippingAt: number;
  standardPaise: number;
};

export function shippingDisplayFromPolicy(policy: Pick<ShippingPolicy, "freeShippingPaise" | "standardPaise">): ShippingDisplay {
  const freeShippingPaise = Number.isInteger(policy.freeShippingPaise) && policy.freeShippingPaise >= 0
    ? policy.freeShippingPaise
    : DEFAULT_FREE_SHIPPING_PAISE;
  const standardPaise = Number.isInteger(policy.standardPaise) && policy.standardPaise >= 0
    ? policy.standardPaise
    : 7900;
  return {
    freeShippingPaise,
    freeShippingAt: freeShippingPaise / 100,
    standardPaise,
  };
}

export const DEFAULT_SHIPPING_DISPLAY: ShippingDisplay = {
  freeShippingPaise: DEFAULT_FREE_SHIPPING_PAISE,
  freeShippingAt: DEFAULT_FREE_SHIPPING_PAISE / 100,
  standardPaise: 7900,
};
