"use client";

import { Ban, Check, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const base =
  "relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-full px-4 text-sm font-medium transition-[filter,background-color,border-color,color] duration-300 disabled:cursor-not-allowed disabled:border disabled:border-[#e7dfd4] disabled:bg-[#e7dfd4] disabled:text-[#8a8178] disabled:shadow-none disabled:hover:bg-[#e7dfd4]";

/** Filled bronze gradient — Add to cart */
const addClass =
  "border-0 bg-[linear-gradient(105deg,#6b4226_0%,#b88955_48%,#5a361c_100%)] text-white shadow-[0_10px_22px_-12px_rgba(90,54,28,0.75)] hover:brightness-[1.06]";

/** Cream outline — In cart */
const inCartClass =
  "border border-[#5c4033] bg-[#f7f3ee] text-[#5c4033] hover:bg-[#efe8df]";

function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={cn("h-5.5 w-5.5", className)}
      fill="currentColor"
    >
      <path d="M8 0c.35 3.2 1.55 5.05 4.4 5.7C9.55 6.35 8.35 8.2 8 11.4 7.65 8.2 6.45 6.35 3.6 5.7 6.45 5.05 7.65 3.2 8 0Z" />
    </svg>
  );
}

type ProductCartCtaProps = {
  soldOut?: boolean;
  inCart?: boolean;
  onAdd: () => void;
  onOpenCart: () => void;
  addLabel?: string;
  inCartLabel?: string;
};

export function ProductCartCta({
  soldOut,
  inCart,
  onAdd,
  onOpenCart,
  addLabel = "Add to cart",
  inCartLabel = "In cart",
}: ProductCartCtaProps) {
  if (soldOut) {
    return (
      <button type="button" disabled className={cn(base, addClass)}>
        <Ban size={16} aria-hidden /> Sold out
      </button>
    );
  }

  if (inCart) {
    return (
      <button type="button" onClick={onOpenCart} className={cn(base, inCartClass)}>
        <Check size={16} strokeWidth={2.25} aria-hidden />
        {inCartLabel}
      </button>
    );
  }

  return (
    <button type="button" onClick={onAdd} className={cn(base, addClass)}>
      <ShoppingBag size={16} aria-hidden />
      {addLabel}
      <span
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/45"
      >
        <Sparkle />
      </span>
    </button>
  );
}
