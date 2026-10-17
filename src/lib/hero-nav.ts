"use client";

import { useSyncExternalStore } from "react";

/**
 * Hero photos and the navbar that should sit on them.
 * `nav` is the link and icon color while the bar is transparent:
 * "white" on a dark photo, "ink" on a light photo.
 * Change `nav` whenever you swap or edit `src`.
 */
export const heroBackdrops = [
  { src: "/silknknot/hero-butter-right.jpg", mobile: "/silknknot/hero-butter-mobile.jpg", nav: "ink" },
  { src: "/silknknot/hero-soap-right.jpg", mobile: "/silknknot/hero-soap-mobile.jpg", nav: "ink" },
  { src: "/silknknot/hero-salts-right.jpg", mobile: "/silknknot/hero-salts-mobile.jpg", nav: "ink" },
] as const;

export type HeroNavTone = "white" | "ink" | (typeof heroBackdrops)[number]["nav"];

let tone: HeroNavTone = heroBackdrops[0].nav;
const listeners = new Set<() => void>();

export function setHeroNav(next: HeroNavTone) {
  if (tone === next) return;
  tone = next;
  listeners.forEach((listener) => listener());
}

export function useHeroNav() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => tone,
    () => heroBackdrops[0].nav,
  );
}
