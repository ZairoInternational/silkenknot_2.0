"use client";

import { useId } from "react";
import type { LucideProps } from "lucide-react";

const MASK = "/silknknot/icons/made-in-india-hands.png";

/**
 * Hands forming a heart — Made in India mark.
 * Color follows `currentColor` (same theme tint as Lucide claim icons).
 */
export function MadeInIndiaHands({ size = 24, className }: LucideProps) {
  const maskId = useId().replace(/:/g, "");
  const px = typeof size === "number" ? size : Number.parseFloat(String(size)) || 24;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
      style={{ display: "inline-block", flexShrink: 0, overflow: "visible" }}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <image href={MASK} width="24" height="24" preserveAspectRatio="xMidYMid meet" />
        </mask>
      </defs>
      <rect width="24" height="24" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
