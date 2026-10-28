"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Media } from "@/components/ui";

const wipeEase = "duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

const addDesktop =
  "absolute inset-x-3 bottom-3 z-20 hidden items-center justify-center gap-2 rounded-full bg-[linear-gradient(105deg,#6b4226_0%,#b88955_48%,#5a361c_100%)] py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white opacity-0 shadow-[0_10px_22px_-12px_rgba(90,54,28,0.75)] transition-[opacity,filter] duration-300 group-hover:opacity-100 group-focus-within:opacity-100 hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-40 md:flex";

const inCartDesktop =
  "absolute inset-x-3 bottom-3 z-20 hidden items-center justify-center gap-2 rounded-full border border-[#5c4033] bg-[#f7f3ee]/95 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#5c4033] opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 md:flex";

const navBtn =
  "absolute top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-[#2c2926]/70 backdrop-blur-[1px] transition active:scale-95 md:hidden";

const addMobile =
  "mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(105deg,#6b4226_0%,#b88955_48%,#5a361c_100%)] px-3 py-2.5 text-[11px] font-medium text-white shadow-[0_10px_22px_-12px_rgba(90,54,28,0.75)] md:hidden disabled:cursor-not-allowed disabled:opacity-50";

const inCartMobile =
  "mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-[#5c4033] bg-[#f7f3ee] px-3 py-2.5 text-[11px] font-medium text-[#5c4033] shadow-sm md:hidden";

type ListingCardMediaProps = {
  href: string;
  name: string;
  /** Product gallery — first is primary; second+ used for wipe / mobile arrows. */
  images: string[];
  sizes: string;
  soldOut?: boolean;
  inCart?: boolean;
  onAdd: (event: React.MouseEvent) => void;
  badge?: React.ReactNode;
  wishlist?: React.ReactNode;
};

/** Desktop: slow hover wipe. Mobile: faint < > on image; bag CTA is rendered by CardMobileAdd after details. */
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
}: ListingCardMediaProps) {
  const gallery = images.filter(Boolean);
  const primary = gallery[0] || "";
  const secondary = gallery[1];
  const multi = gallery.length > 1;
  const label = soldOut ? "Sold out" : inCart ? "In bag" : "Add to cart";
  const desktopClass = inCart && !soldOut ? inCartDesktop : addDesktop;

  const [active, setActive] = useState(0);
  const current = gallery[active] || primary;

  const prev = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setActive((index) => (index - 1 + gallery.length) % gallery.length);
  };

  const next = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setActive((index) => (index + 1) % gallery.length);
  };

  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-[#efe8df] md:aspect-[4/5]">
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

      {/* Mobile: single image + faint arrow controls */}
      <div className="absolute inset-0 md:hidden">
        <Link href={href} className="absolute inset-0" aria-label={name}>
          {current ? (
            <Media src={current} alt={name} sizes={sizes} className="object-cover" />
          ) : (
            <span className="grid h-full place-items-center px-4 text-center text-sm text-[#6f675d]">{name}</span>
          )}
        </Link>
        {multi ? (
          <>
            <button type="button" onClick={prev} className={`${navBtn} left-1.5`} aria-label="Previous image">
              <ChevronLeft size={18} strokeWidth={1.75} />
            </button>
            <button type="button" onClick={next} className={`${navBtn} right-1.5`} aria-label="Next image">
              <ChevronRight size={18} strokeWidth={1.75} />
            </button>
          </>
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
}: {
  soldOut?: boolean;
  inCart?: boolean;
  onAdd: (event: React.MouseEvent) => void;
}) {
  const label = soldOut ? "Sold out" : inCart ? "In bag" : "Add to cart";
  const className = inCart && !soldOut ? inCartMobile : addMobile;
  return (
    <button type="button" onClick={onAdd} disabled={soldOut} className={className} aria-label={label}>
      {soldOut ? null : <ShoppingBag size={15} aria-hidden />}
      <span>{label}</span>
    </button>
  );
}

/** Compact gold rating line for listing cards. */
export function CardGoldRating({ rating, count }: { rating: number; count?: number }) {
  if (!rating) return null;
  const full = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <p className="mt-2 flex items-center gap-2 leading-none text-[#8a7350]" aria-label={`${rating} out of 5 stars`}>
      <span className="text-[18px] tracking-[0.08em] text-[#C9A227] md:text-[19px]" aria-hidden>
        {"★".repeat(full)}
        <span className="text-[#e0d5c0]">{"★".repeat(5 - full)}</span>
      </span>
      <span className="text-[14px] font-medium tabular-nums text-[#6f675d] md:text-[15px]">
        {rating % 1 === 0 ? rating.toFixed(0) : rating.toFixed(1)}
      </span>
      {typeof count === "number" && count > 0 ? (
        <span className="text-[13px] text-[#a3988c]">({count})</span>
      ) : null}
    </p>
  );
}
