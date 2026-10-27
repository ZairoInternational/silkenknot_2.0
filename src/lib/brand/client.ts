"use client";

import { useEffect, useState } from "react";
import { DEFAULT_BRAND, type BrandSettings } from "@/lib/brand/content";

let cached: BrandSettings | null = null;
let inflight: Promise<BrandSettings> | null = null;

async function loadBrand(): Promise<BrandSettings> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch("/api/brand")
      .then(async (response) => {
        const body = (await response.json()) as { brand?: BrandSettings };
        const next = body.brand || DEFAULT_BRAND;
        cached = next;
        return next;
      })
      .catch(() => {
        cached = DEFAULT_BRAND;
        return DEFAULT_BRAND;
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
}

/** Seed the client cache and notify open Mark/Logo instances after a Studio save. */
export function primeBrandCache(brand: BrandSettings) {
  cached = brand;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BRAND_EVENT, { detail: brand }));
  }
}

export function useBrandSettings(): BrandSettings {
  const [brand, setBrand] = useState<BrandSettings>(cached || DEFAULT_BRAND);

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
