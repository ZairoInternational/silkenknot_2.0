"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { Media, PriceTag, Stars } from "@/components/ui";

export function ProductCard({ product }: { product: Product }) {
  const store = useStore();
  const wished = store.isWished(product.id);
  const variant = product.variants[0];
  const [showAlt, setShowAlt] = useState(false);

  const add = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const result = store.addToCart(product.id, variant.label, 1);
    if (result.ok) store.openCart();
    else if (result.message) store.notify(result.message);
  };

  return (
    <article className="group transition duration-200 hover:-translate-y-0.5">
      <div
        className="relative aspect-[4/5] overflow-hidden bg-cream"
        onMouseEnter={() => setShowAlt(true)}
        onFocus={() => setShowAlt(true)}
      >
        <Link href={`/products/${product.slug}`} className="absolute inset-0" aria-label={product.name}>
          <Media
            src={product.images[0]}
            alt={product.name}
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-contain transition duration-700 group-hover:scale-[1.04]"
          />
          {showAlt && product.images[1] ? (
            <span className="absolute inset-0 opacity-0 transition duration-700 group-hover:opacity-100">
              <Media src={product.images[1]} alt="" sizes="(min-width: 1024px) 25vw, 50vw" className="object-contain" />
            </span>
          ) : null}
        </Link>
        <button
          type="button"
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
          aria-pressed={wished}
          onClick={() => {
            const result = store.toggleWishlist(product.id);
            if (result.message) store.notify(result.message);
          }}
          className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center bg-paper/80"
        >
          <Heart size={16} strokeWidth={1.5} fill={wished ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          onClick={add}
          className="absolute inset-x-3 bottom-3 z-20 hidden bg-paper/95 py-3 text-[11px] uppercase tracking-[0.16em] opacity-0 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100 md:block"
        >
          Quick add
        </button>
      </div>
      <div className="mt-4">
        <p className="eyebrow text-mute">{product.type}</p>
        <h3 className="mt-1 font-serif text-[1.7rem] leading-none">
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <PriceTag price={product.price} compare={product.compareAtPrice} />
          <Stars rating={product.rating} />
        </div>
        <button type="button" onClick={add} className="mt-3 text-[11px] uppercase tracking-[0.16em] md:hidden">
          Add
        </button>
      </div>
    </article>
  );
}
