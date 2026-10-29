"use client";

import type { ReactNode } from "react";

/** Shared chrome for admin drafts that mirror the live storefront. */
export function DraftPreviewFrame({
  children,
  title = "Live preview",
  hint = "Updates as you edit. Not on the site until you save.",
  badge = "Draft",
  className = "",
  bodyClassName = "bg-[#f6f1ea]",
}: {
  children: ReactNode;
  title?: string;
  hint?: string;
  badge?: string;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_18px_40px_-28px_rgba(44,41,38,0.35)] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">{title}</p>
          <p className="text-xs text-mute">{hint}</p>
        </div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-mute">{badge}</p>
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
