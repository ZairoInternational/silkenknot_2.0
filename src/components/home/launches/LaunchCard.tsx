"use client";

import Link from "next/link";
import { Ban, Check, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { Media, PriceTag, Stars, WishlistButton, usePrefersReducedMotion } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

const actionClass = "flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#CBAC7C] px-3 text-sm font-medium text-white transition-colors duration-300 hover:bg-[#b39668] disabled:cursor-not-allowed disabled:bg-[#e7dfd4] disabled:text-[#8a8178] disabled:hover:bg-[#e7dfd4]";

export function LaunchCard({ product }: { product: Product }) {
  const store = useStore();
  const reduced = usePrefersReducedMotion();
  const variant = product.variants.reduce(
    (lowest, item) => (item.price < lowest.price ? item : lowest),
    product.variants[0],
  );
  const price = variant?.price ?? product.price;
  const soldOut = product.variants.length > 0 && product.variants.every((item) => item.stock <= 0);
  const single = product.variants.length === 1;
  const inBag = Boolean(
    variant && store.cart.some((item) => item.productId === product.id && item.variantLabel === variant.label),
  );

  function add() {
    if (!variant || soldOut) return;
    const result = store.addToCart(product.id, variant.label, 1);
    if (!result.ok && result.message) store.notify(result.message);
  }

  function tilt(event: React.PointerEvent<HTMLElement>) {
    if (reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.transform = `perspective(900px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
  }

  return (
    <article
      onPointerMove={tilt}
      onPointerLeave={(event) => {
        event.currentTarget.style.transform = "";
      }}
      className="flex h-full flex-col overflow-hidden rounded-2xl bg-[#fffcf8] transition-transform duration-200 ease-out motion-reduce:transition-none"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#efe8df]">
        <Link href={`/products/${product.slug}`} className="absolute inset-0">
          <Media
            src={product.images[0]}
            alt={product.name}
            sizes="(min-width: 1024px) 22vw, 78vw"
            className="object-cover transition duration-700 hover:scale-[1.04] motion-reduce:transition-none motion-reduce:hover:scale-100"
          />
        </Link>
        <span className="pointer-events-none absolute left-3 top-3 bg-[#F7F3EE] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#8a7350]">
          New
        </span>
        <div className="absolute right-1 top-1">
          <WishlistButton productId={product.id} name={product.name} />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-1 pt-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#8a8178]">{product.type}</p>
        <h3 className="mt-1 font-serif text-[1.65rem] leading-none text-[#2c2926]">
          <Link href={`/products/${product.slug}`} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm capitalize text-[#6f675d]">{product.scent}</p>
        {product.reviewCount > 0 ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-[#8a8178]">
            <Stars rating={product.rating} />
            <span>{product.rating.toFixed(1)} ({product.reviewCount})</span>
          </p>
        ) : null}
        <div className="mt-3">
          <PriceTag price={price} compare={variant?.compareAtPrice} />
        </div>
        <div className="mt-auto pt-4">
          {soldOut ? (
            <button type="button" disabled className={actionClass}>
              <Ban size={16} aria-hidden /> Sold out
            </button>
          ) : single && inBag ? (
            <button type="button" onClick={store.openCart} className={actionClass}>
              <Check size={16} aria-hidden /> In bag
            </button>
          ) : single ? (
            <button type="button" onClick={add} className={actionClass}>
              <ShoppingBag size={16} aria-hidden /> Add to bag
            </button>
          ) : (
            <Link href={`/products/${product.slug}`} className={actionClass}>
              <SlidersHorizontal size={16} aria-hidden /> Choose option
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
