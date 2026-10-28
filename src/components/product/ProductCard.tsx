"use client";

import Link from "next/link";
import { PriceTag, WishlistButton } from "@/components/ui";
import { CardGoldRating, CardMobileAdd, ListingCardMedia } from "@/components/product/ListingCardMedia";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const store = useStore();
  const variant = product.variants[0];
  const soldOut = product.variants.length > 0 && product.variants.every((item) => item.stock <= 0);
  const inBag = Boolean(
    variant && store.cart.some((item) => item.productId === product.id && item.variantLabel === variant.label),
  );

  const add = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!variant || soldOut) return;
    if (inBag) {
      store.openCart();
      return;
    }
    const result = store.addToCart(product.id, variant.label, 1);
    if (result.ok) store.openCart();
    else if (result.message) store.notify(result.message);
  };

  return (
    <article className="group min-w-0 transition duration-200 hover:-translate-y-0.5">
      <ListingCardMedia
        href={`/products/${product.slug}`}
        name={product.name}
        images={product.images}
        sizes="(min-width: 1024px) 25vw, 50vw"
        soldOut={soldOut}
        inCart={inBag}
        onAdd={add}
        wishlist={<WishlistButton productId={product.id} name={product.name} />}
      />
      <div className="pt-3">
        <h3 className="truncate text-[15px] font-medium leading-snug text-[#2c2926] md:text-base">
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <CardGoldRating rating={product.rating} count={product.reviewCount} />
        <div className="mt-1.5">
          <PriceTag price={product.price} compare={product.compareAtPrice} />
        </div>
        <CardMobileAdd soldOut={soldOut} inCart={inBag} onAdd={add} />
      </div>
    </article>
  );
}
