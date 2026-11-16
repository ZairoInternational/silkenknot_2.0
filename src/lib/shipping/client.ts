"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SHIPPING_DISPLAY, type ShippingDisplay } from "@/lib/shipping/display";

let cached: ShippingDisplay | null = null;
let inflight: Promise<ShippingDisplay> | null = null;

async function loadShippingDisplay(): Promise<ShippingDisplay> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch("/api/shipping/display")
      .then(async (response) => {
        const body = (await response.json()) as { shipping?: ShippingDisplay };
        const next = body.shipping || DEFAULT_SHIPPING_DISPLAY;
        cached = next;
        return next;
      })
      .catch(() => {
        if (!cached) cached = DEFAULT_SHIPPING_DISPLAY;
        return cached || DEFAULT_SHIPPING_DISPLAY;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

const SHIPPING_DISPLAY_EVENT = "silkknot:shipping-display";

export function clearShippingDisplayCache() {
  cached = null;
}

export function primeShippingDisplayCache(shipping: ShippingDisplay) {
  cached = shipping;
  if (typeof window !== "undefined") {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SHIPPING_DISPLAY_EVENT, { detail: shipping }));
    });
  }
}

/** Live free-shipping threshold from admin shipping settings. */
export function useShippingDisplay(): ShippingDisplay {
  const [shipping, setShipping] = useState<ShippingDisplay>(cached || DEFAULT_SHIPPING_DISPLAY);

  useEffect(() => {
    let cancelled = false;
    void loadShippingDisplay().then((next) => {
      if (!cancelled) setShipping(next);
    });
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<ShippingDisplay>).detail;
      if (detail) setShipping(detail);
    };
    window.addEventListener(SHIPPING_DISPLAY_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(SHIPPING_DISPLAY_EVENT, onUpdate);
    };
  }, []);

  return shipping;
}
