"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { seedProducts } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { PriceTag, WishlistButton, usePrefersReducedMotion } from "@/components/ui";
import { CardGoldRating, CardMobileAdd, ListingCardMedia } from "@/components/product/ListingCardMedia";

export function BestsellerScroll() {
  const store = useStore();

  const catalog = (store.products.length ? store.products : seedProducts).filter((product) => product.active);

  // Prefer actual bestsellers. Fall back to featured products
  // when the catalogue has no products marked as bestsellers.
  const bestsellers = catalog.filter((product) => product.bestseller);
  const featured = catalog.filter((product) => product.featured);

  const products = (bestsellers.length ? bestsellers : featured.length ? featured : catalog).slice(0, 4);

  if (!products.length) return null;

  const shopHref = bestsellers.length ? "/shop?bestseller=1" : "/shop";

  return (
    <section aria-labelledby="bestsellers-heading" className="bg-[#F7F3EE] px-5 py-14 text-[#2c2926] md:px-8 md:py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#8a7350]">The Silken Knot edit</p>
            <h2
              id="bestsellers-heading"
              className="mt-3 font-serif text-[clamp(2.1rem,5vw,3.6rem)] font-medium leading-[0.95] tracking-[-0.03em] text-[#2c2926]"
            >
              Our Bestsellers
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#6f675d] md:text-base">
              Body care and everyday rituals worth making room for.
            </p>
          </div>
          <Link
            href={shopHref}
            className="group inline-flex w-fit items-center gap-2 text-sm text-[#2c2926] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8a7350]"
          >
            <span className="border-b border-[#2c2926]/30 pb-0.5 transition-colors duration-300 group-hover:border-[#CBAC7C]">
              Explore all products
            </span>
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:mt-10 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-6">
          {products.map((product) => (
            <BestsellerCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-10 flex justify-center sm:mt-12">
          <Link
            href={shopHref}
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#e3dbd1] bg-[#fffcf8] px-7 py-3 text-sm font-medium text-[#2c2926] transition-colors hover:border-[#CBAC7C] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]"
          >
            Find your next favourite
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function BestsellerCard({ product }: { product: Product }) {
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
  const hasDiscount =
    typeof (variant?.compareAtPrice ?? product.compareAtPrice) === "number" &&
    (variant?.compareAtPrice ?? product.compareAtPrice)! > price;
  const compare = variant?.compareAtPrice ?? product.compareAtPrice;
  const discount =
    hasDiscount && compare ? Math.round(((compare - price) / compare) * 100) : 0;

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
        images={product.images ?? []}
        sizes="(min-width: 1024px) 22vw, (min-width: 640px) 50vw, 50vw"
        soldOut={soldOut}
        inCart={inBag}
        onAdd={add}
        wishlist={<WishlistButton productId={product.id} name={product.name} />}
        badge={
          <>
            {product.bestseller ? (
              <span className="bg-[#F7F3EE]/92 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#8a7350] backdrop-blur-sm">
                Bestseller
              </span>
            ) : product.newArrival ? (
              <span className="bg-[#F7F3EE]/92 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#8a7350] backdrop-blur-sm">
                New
              </span>
            ) : null}
            {hasDiscount ? (
              <span className="bg-[#2c2926]/90 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                {discount}% off
              </span>
            ) : null}
          </>
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
          <PriceTag price={price} compare={compare} />
        </div>
        <CardMobileAdd soldOut={soldOut} inCart={inBag} onAdd={add} />
      </div>
    </article>
  );
}
