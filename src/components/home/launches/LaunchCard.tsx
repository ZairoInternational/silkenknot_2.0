"use client";

import Link from "next/link";
import { PriceTag, WishlistButton, usePrefersReducedMotion } from "@/components/ui";
import { CardGoldRating, CardMobileAdd, ListingCardMedia } from "@/components/product/ListingCardMedia";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export function LaunchCard({ product }: { product: Product }) {
  const store = useStore();
  const reduced = usePrefersReducedMotion();
  const variant = product.variants.reduce(
    (lowest, item) => (item.price < lowest.price ? item : lowest),
    product.variants[0],
  );
  const price = variant?.price ?? product.price;
  const soldOut = product.variants.length > 0 && product.variants.every((item) => item.stock <= 0);
  const inBag = Boolean(
    variant && store.cart.some((item) => item.productId === product.id && item.variantLabel === variant.label),
  );

  function add(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!variant || soldOut) return;
    if (inBag) {
      store.openCart();
      return;
    }
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
      className="group flex h-full min-w-0 flex-col transition-transform duration-200 ease-out motion-reduce:transition-none"
    >
      <ListingCardMedia
        href={`/products/${product.slug}`}
        name={product.name}
        images={product.images}
        sizes="(min-width: 1024px) 22vw, 78vw"
        soldOut={soldOut}
        inCart={inBag}
        onAdd={add}
        wishlist={<WishlistButton productId={product.id} name={product.name} />}
        badge={
          <span className="bg-[#F7F3EE]/92 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#8a7350] backdrop-blur-sm">
            New
          </span>
        }
      />
      <div className="pt-3">
        <h3 className="truncate text-[15px] font-medium leading-snug text-[#2c2926] md:text-base">
          <Link
            href={`/products/${product.slug}`}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]"
          >
            {product.name}
          </Link>
        </h3>
        <CardGoldRating rating={product.rating} count={product.reviewCount} />
        <div className="mt-1.5">
          <PriceTag price={price} compare={variant?.compareAtPrice} />
        </div>
        <CardMobileAdd soldOut={soldOut} inCart={inBag} onAdd={add} />
      </div>
    </article>
  );
}
