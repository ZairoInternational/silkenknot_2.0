"use client";

import { useEffect, useState } from "react";
import { DEFAULT_BRAND, type BrandSettings } from "@/lib/brand/content";

let cached: BrandSettings | null = null;
let inflight: Promise<BrandSettings> | null = null;
/** True once server or admin has seeded a real brand — avoid flashing DEFAULT on first paint. */
let seededFromServer = false;

async function loadBrand(): Promise<BrandSettings> {
  if (cached && seededFromServer) return cached;
  if (!inflight) {
    inflight = fetch("/api/brand")
      .then(async (response) => {
        const body = (await response.json()) as { brand?: BrandSettings };
        const next = body.brand || DEFAULT_BRAND;
        cached = next;
        seededFromServer = true;
        return next;
      })
      .catch(() => {
        if (!cached) cached = DEFAULT_BRAND;
        return cached || DEFAULT_BRAND;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

const BRAND_EVENT = "silkknot:brand";

/** Invalidate after admin saves so the next load picks up the new icon. */
export function clearBrandCache() {
  cached = null;
  seededFromServer = false;
}

/**
 * Seed the client cache (from RSC layout or after Studio save) and notify listeners.
 * Call synchronously during Providers render so the first logo paint is already correct.
 */
export function primeBrandCache(brand: BrandSettings) {
  const unchanged = cached && JSON.stringify(cached) === JSON.stringify(brand);
  cached = brand;
  seededFromServer = true;
  // Defer notify — sync dispatch during Providers render triggers setState-in-render.
  if (!unchanged && typeof window !== "undefined") {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(BRAND_EVENT, { detail: brand }));
    });
  }
}

export function useBrandSettings(): BrandSettings {
  const [brand, setBrand] = useState<BrandSettings>(() => cached || DEFAULT_BRAND);

  useEffect(() => {
    let cancelled = false;
    void loadBrand().then((next) => {
      if (!cancelled) setBrand(next);
    });
    const onBrand = (event: Event) => {
      const detail = (event as CustomEvent<BrandSettings>).detail;
      if (detail) setBrand(detail);
    };
    window.addEventListener(BRAND_EVENT, onBrand);
    return () => {
      cancelled = true;
      window.removeEventListener(BRAND_EVENT, onBrand);
    };
  }, []);

  return brand;
}
