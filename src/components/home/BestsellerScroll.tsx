"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { seedProducts } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { PriceTag, Reveal, WishlistButton } from "@/components/ui";
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
    <section
      aria-labelledby="bestsellers-heading"
      className="bg-sand px-4 py-16 text-ink sm:px-6 sm:py-20 lg:px-10 lg:py-24"
    >
      <div className="mx-auto max-w-[1440px]">
        <Reveal>
          <div className="mb-9 flex flex-col gap-6 sm:mb-11 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-mist-ink">
                <span className="h-px w-8 bg-mist" aria-hidden />
                The Silken Knot edit
              </p>
              <h2
                id="bestsellers-heading"
                className="mt-3 font-serif text-[clamp(2.2rem,5vw,3.5rem)] font-medium leading-[0.98] tracking-[-0.03em] text-ink"
              >
                Our Bestsellers
              </h2>
              <p className="mt-3 max-w-md text-base leading-relaxed text-ink/80 md:text-lg">
                Body care and everyday rituals worth making room for.
              </p>
            </div>
            <Link
              href={shopHref}
              className="group inline-flex w-fit shrink-0 cursor-pointer items-center gap-3 rounded-full bg-ink py-1.5 pl-6 pr-1.5 text-sm text-paper transition-colors hover:bg-midnight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Explore all
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-paper text-ink transition-transform duration-300 ease-out group-hover:rotate-45 motion-reduce:transition-none motion-reduce:group-hover:rotate-0">
                <ArrowRight size={16} />
              </span>
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {products.map((product, index) => (
            <BestsellerCard key={product.id} product={product} rank={index + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BestsellerCard({ product, rank }: { product: Product; rank: number }) {
  const store = useStore();
  const variant = product.variants.reduce(
    (lowest, item) => (item.price < lowest.price ? item : lowest),
    product.variants[0],
  );
  const price = variant?.price ?? product.price;
  const soldOut = product.variants.length > 0 && product.variants.every((item) => item.stock <= 0);
  const inBag = Boolean(
    variant && store.cart.some((item) => item.productId === product.id && item.variantLabel === variant.label),
  );
  const compare = variant?.compareAtPrice ?? product.compareAtPrice;
  // Match shop ProductCard: type · scent (same on mobile + desktop).
  const meta = [product.type, product.scent].filter(Boolean).join(" · ");

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

  return (
    <article className="group flex h-full min-w-0 flex-col md:rounded-[1.35rem] md:border md:border-line md:bg-paper md:p-2 md:transition-[box-shadow,border-color] md:duration-300 md:ease-out md:hover:border-mist/60 md:hover:shadow-[0_14px_34px_rgba(17,17,17,0.1)]">
      <div className="relative">
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
            product.bestseller ? (
              <span className="rounded-full bg-[#1c1b19] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-white">
                Bestseller
              </span>
            ) : product.newArrival ? (
              <span className="rounded-full bg-[#1c1b19] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-white">
                New
              </span>
            ) : null
          }
        />
        <span
          className="pointer-events-none absolute bottom-3 left-3 z-10 hidden min-w-8 items-center justify-center rounded-full border border-white/40 bg-ink/70 px-2 py-1 font-serif text-[11px] tabular-nums tracking-wide text-white backdrop-blur-md md:inline-flex"
          aria-hidden
        >
          {String(rank).padStart(2, "0")}
        </span>
      </div>

      {/* Mobile: original flat card details. Desktop: Soft UI padded block. */}
      <div className="pt-3 md:flex md:flex-1 md:flex-col md:px-3 md:pb-2.5 md:pt-3.5">
        {meta ? (
          <p className="mb-1 line-clamp-1 text-[13px] capitalize leading-snug text-mute md:text-sm">
            {meta}
          </p>
        ) : null}
        <h3 className="truncate text-base font-medium leading-snug text-ink md:line-clamp-2 md:whitespace-normal md:text-lg">
          <Link
            href={`/products/${product.slug}`}
            className="transition-colors duration-200 hover:text-mist-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist"
          >
            {product.name}
          </Link>
        </h3>
        <CardGoldRating rating={product.rating} count={product.reviewCount} />
        <div className="mt-1.5 md:mt-0.5 md:text-base">
          <PriceTag price={price} compare={compare} />
        </div>
        <div className="md:mt-auto md:pt-1">
          <CardMobileAdd soldOut={soldOut} inCart={inBag} onAdd={add} />
        </div>
      </div>
    </article>
  );
}
