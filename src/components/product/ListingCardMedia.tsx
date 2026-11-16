"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Media } from "@/components/ui";
import { SHOW_STORE_REVIEWS } from "@/lib/storefront-reviews";

const wipeEase = "duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

const addDesktop =
  "absolute inset-x-3 bottom-3 z-20 hidden items-center justify-center gap-2 rounded-full bg-mist py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-paper opacity-0 shadow-[0_10px_22px_-12px_rgba(41,43,43,0.45)] transition-[opacity,filter,background-color] duration-300 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-midnight disabled:cursor-not-allowed disabled:opacity-40 md:flex";

const inCartDesktop =
  "absolute inset-x-3 bottom-3 z-20 hidden items-center justify-center gap-2 rounded-full border border-mist bg-mist py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-paper opacity-0 shadow-sm backdrop-blur-sm transition-[opacity,background-color,border-color] duration-300 group-hover:opacity-100 group-focus-within:opacity-100 hover:border-midnight hover:bg-midnight md:flex";

const addMobile =
  "mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-ink px-3 py-2.5 text-[11px] font-medium text-paper shadow-[0_10px_22px_-12px_rgba(41,43,43,0.45)] md:hidden hover:bg-midnight disabled:cursor-not-allowed disabled:opacity-50";

const inCartMobile =
  "mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-ink bg-paper px-3 py-2.5 text-[11px] font-medium text-ink shadow-sm md:hidden hover:border-mist hover:bg-mist";

const addMobileCompact =
  "flex w-full items-center justify-center gap-1.5 rounded-full bg-ink px-2.5 py-2 text-xs font-medium text-paper md:hidden hover:bg-midnight disabled:cursor-not-allowed disabled:opacity-50";

const inCartMobileCompact =
  "flex w-full items-center justify-center gap-1.5 rounded-full border border-ink bg-paper px-2.5 py-2 text-xs font-medium text-ink md:hidden hover:border-mist hover:bg-mist";

type ListingCardMediaProps = {
  href: string;
  name: string;
  /** Product gallery — first is primary; second+ used for wipe / mobile swipe. */
  images: string[];
  sizes: string;
  soldOut?: boolean;
  inCart?: boolean;
  onAdd: (event: React.MouseEvent) => void;
  badge?: React.ReactNode;
  wishlist?: React.ReactNode;
  className?: string;
  /** Mobile image fit. Desktop wipe stays cover. */
  fit?: "cover" | "contain";
};

/** Desktop: slow hover wipe. Mobile: swipe gallery with bottom dots. */
export function ListingCardMedia({
  href,
  name,
  images,
  sizes,
  soldOut,
  inCart,
  onAdd,
  badge,
  wishlist,
  className = "",
  fit = "cover",
}: ListingCardMediaProps) {
  const gallery = images.filter(Boolean);
  const primary = gallery[0] || "";
  const secondary = gallery[1];
  const multi = gallery.length > 1;
  const label = soldOut ? "Sold out" : inCart ? "In bag" : "Add to cart";
  const desktopClass = inCart && !soldOut ? inCartDesktop : addDesktop;

  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const mobileFit = fit === "contain" ? "object-contain p-2" : "object-cover";

  const syncActive = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !el.clientWidth) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.min(Math.max(next, 0), Math.max(gallery.length - 1, 0)));
  }, [gallery.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => syncActive();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [syncActive, multi]);

  const goTo = (index: number, event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setActive(index);
  };

  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-2xl bg-[#efe8df] md:aspect-[4/5] ${className}`}>
      {/* Desktop: hover wipe between first two images */}
      <Link href={href} className="absolute inset-0 hidden md:block" aria-label={name}>
        {primary ? (
          <Media src={primary} alt={name} sizes={sizes} className="object-cover" />
        ) : (
          <span className="grid h-full place-items-center px-4 text-center text-sm text-[#6f675d]">{name}</span>
        )}
        {primary && secondary ? (
          <span
            className={`absolute inset-0 z-[1] [clip-path:inset(0_100%_0_0)] transition-[clip-path] ${wipeEase} group-hover:[clip-path:inset(0_0_0_0)] group-focus-within:[clip-path:inset(0_0_0_0)] motion-reduce:transition-none`}
            aria-hidden
          >
            <Media src={secondary} alt="" sizes={sizes} className="object-cover" />
          </span>
        ) : null}
      </Link>

      {/* Mobile: swipeable gallery + bottom dots */}
      <div className="absolute inset-0 md:hidden">
        {multi ? (
          <div
            ref={scrollerRef}
            className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {gallery.map((src, index) => (
              <Link
                key={`${src}-${index}`}
                href={href}
                className="relative h-full w-full shrink-0 snap-center"
                aria-label={index === 0 ? name : `${name}, image ${index + 1}`}
                tabIndex={index === active ? 0 : -1}
              >
                <Media src={src} alt={name} sizes={sizes} className={mobileFit} />
              </Link>
            ))}
          </div>
        ) : (
          <Link href={href} className="absolute inset-0" aria-label={name}>
            {primary ? (
              <Media src={primary} alt={name} sizes={sizes} className={mobileFit} />
            ) : (
              <span className="grid h-full place-items-center px-4 text-center text-sm text-[#6f675d]">{name}</span>
            )}
          </Link>
        )}

        {multi ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-2.5 z-10 flex items-center justify-center gap-1.5"
            role="tablist"
            aria-label="Product images"
          >
            {gallery.map((_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-label={`Show image ${index + 1}`}
                aria-selected={index === active}
                onClick={(event) => goTo(index, event)}
                className={`pointer-events-auto h-1.5 rounded-full transition-[width,background-color] duration-200 ${
                  index === active ? "w-4 bg-ink/85" : "w-1.5 bg-ink/30"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {badge ? <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex flex-wrap gap-1.5 md:left-3 md:top-3">{badge}</div> : null}
      {wishlist ? <div className="absolute right-1.5 top-1.5 z-10">{wishlist}</div> : null}

      <button type="button" onClick={onAdd} disabled={soldOut} className={desktopClass}>
        {soldOut ? null : <ShoppingBag size={14} aria-hidden />}
        {label}
      </button>
    </div>
  );
}

/** Mobile-only bag CTA — place after name / rating / price. */
export function CardMobileAdd({
  soldOut,
  inCart,
  onAdd,
  compact = false,
}: {
  soldOut?: boolean;
  inCart?: boolean;
  onAdd: (event: React.MouseEvent) => void;
  compact?: boolean;
}) {
  const label = soldOut ? "Sold out" : inCart ? "In bag" : "Add to cart";
  const className = compact
    ? inCart && !soldOut
      ? inCartMobileCompact
      : addMobileCompact
    : inCart && !soldOut
      ? inCartMobile
      : addMobile;
  return (
    <button type="button" onClick={onAdd} disabled={soldOut} className={className} aria-label={label}>
      {soldOut ? null : <ShoppingBag size={compact ? 14 : 15} aria-hidden />}
      <span>{label}</span>
    </button>
  );
}

/** Champagne rating line for listing cards (palette supporting accent). */
export function CardGoldRating({ rating, count }: { rating: number; count?: number }) {
  if (!SHOW_STORE_REVIEWS || !rating) return null;
  const full = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <p className="mt-1 flex items-center gap-1.5 leading-none text-mute md:mt-2 md:gap-2" aria-label={`${rating} out of 5 stars`}>
      <span className="text-sm tracking-[0.08em] text-champagne md:text-[19px]" aria-hidden>
        {"★".repeat(full)}
        <span className="text-champagne/35">{"★".repeat(5 - full)}</span>
      </span>
      <span className="text-xs font-medium tabular-nums text-ink/70 md:text-[15px]">
        {rating % 1 === 0 ? rating.toFixed(0) : rating.toFixed(1)}
      </span>
      {typeof count === "number" && count > 0 ? (
        <span className="text-xs text-ink/45 md:text-[13px]">({count})</span>
      ) : null}
    </p>
  );
}
