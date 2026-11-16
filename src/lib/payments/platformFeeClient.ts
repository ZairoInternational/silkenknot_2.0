"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PLATFORM_FEE_DISPLAY,
  type PlatformFeeDisplay,
} from "@/lib/payments/platformFeeDisplay";

let cached: PlatformFeeDisplay | null = null;
let inflight: Promise<PlatformFeeDisplay> | null = null;

async function loadPlatformFeeDisplay(): Promise<PlatformFeeDisplay> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch("/api/checkout/platform-fee")
      .then(async (response) => {
        const body = (await response.json()) as { platformFee?: PlatformFeeDisplay };
        const next = body.platformFee || DEFAULT_PLATFORM_FEE_DISPLAY;
        cached = next;
        return next;
      })
      .catch(() => {
        if (!cached) cached = DEFAULT_PLATFORM_FEE_DISPLAY;
        return cached || DEFAULT_PLATFORM_FEE_DISPLAY;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

const PLATFORM_FEE_EVENT = "silkknot:platform-fee";

export function clearPlatformFeeDisplayCache() {
  cached = null;
}

export function usePlatformFeeDisplay(): PlatformFeeDisplay {
  const [platformFee, setPlatformFee] = useState<PlatformFeeDisplay>(cached || DEFAULT_PLATFORM_FEE_DISPLAY);

  useEffect(() => {
    let cancelled = false;
    void loadPlatformFeeDisplay().then((next) => {
      if (!cancelled) setPlatformFee(next);
    });
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<PlatformFeeDisplay>).detail;
      if (detail) setPlatformFee(detail);
    };
    window.addEventListener(PLATFORM_FEE_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(PLATFORM_FEE_EVENT, onUpdate);
    };
  }, []);

  return platformFee;
}
