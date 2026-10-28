"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Gift, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { seedProducts } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { useSiteMedia } from "@/lib/site-media/client";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { Media } from "@/components/ui";

/** Budget tiers in rupees. Change the numbers to match your prices. */
const TIERS = [
  {
    id: "small",
    label: "Under ₹999",
    note: "Little thank-yous",
    min: 0,
    max: 999,
  },
  {
    id: "mid",
    label: "₹1,000 to ₹1,999",
    note: "For family and friends",
    min: 1000,
    max: 1999,
  },
  {
    id: "luxe",
    label: "₹2,000 and above",
    note: "The grand gesture",
    min: 2000,
    max: Infinity,
  },
];

/** Each product's own photo. If your Product type names the field differently, change it here. */
function productImage(product: Product, index: number, fallbackShots: string[]) {
  const p = product as unknown as { images?: string[]; image?: string };
  return (
    p.images?.[0] ?? p.image ?? fallbackShots[index % fallbackShots.length]
  );
}

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]";

export function GiftSets() {
  const media = useSiteMedia();
  const fallbackShots = [media.bestsellerButter, media.bestsellerSoap, media.bestsellerCandle];
  const store = useStore();
  const catalog = (
    store.products.length ? store.products : seedProducts
  ).filter((p) => p.active);
  const [tier, setTier] = useState(TIERS[0].id);

  const byTier = TIERS.map((t) => ({
    ...t,
    items: catalog
      .filter((p) => p.price >= t.min && p.price <= t.max)
      .sort((a, b) => Number(b.bestseller) - Number(a.bestseller))
      .slice(0, 3),
  })).filter((t) => t.items.length > 0);

  if (!byTier.length) return null;
  const current = byTier.find((t) => t.id === tier) ?? byTier[0];

  return (
    <section
      className="relative overflow-hidden bg-[#f7f3ee] text-[#2c2926]"
      aria-label="Gifts by budget"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(45% 50% at 100% 0%, rgba(232,185,106,0.22), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 md:py-20">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#e6dfd4] bg-white/60 px-3.5 py-1.5 text-[13px] text-[#8a7350]">
              <Gift size={14} /> Gift wrap available at checkout
            </p>
            <h2 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.035em] md:text-5xl">
              Gifts for every budget
            </h2>
            <p className="mt-2 max-w-md text-base text-[#6f675d]">
              Pick what you want to spend and we will show what is worth giving.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Gift budget"
            className="flex flex-wrap gap-2"
          >
            {byTier.map((t) => {
              const selected = t.id === current.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTier(t.id)}
                  className={`rounded-full border px-4 py-2.5 text-sm transition-colors duration-300 ${FOCUS} ${
                    selected
                      ? "border-[#2c2926] bg-[#2c2926] text-[#f7f3ee]"
                      : "border-[#2c2926]/20 hover:border-[#2c2926]"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-6 text-sm text-[#8a7350]">{current.note}</p>

        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={current.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="shelf-scroll -mx-5 mt-4 flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0"
          >
            {current.items.map((product, i) => (
              <li
                key={product.id}
                className="w-[74%] shrink-0 snap-start sm:w-[46%] md:w-auto"
              >
                <GiftCard product={product} image={productImage(product, i, fallbackShots)} />
              </li>
            ))}
          </motion.ul>
        </AnimatePresence>

        <Link
          href="/shop"
          className={`group mt-8 inline-flex items-center gap-2 text-sm underline decoration-[#CBAC7C] decoration-2 underline-offset-[6px] ${FOCUS}`}
        >
          See every gift idea
          <ArrowRight
            size={14}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </div>
    </section>
  );
}

function GiftCard({ product, image }: { product: Product; image: string }) {
  const store = useStore();
  const variant = product.variants[0];
  const inCart = variant
    ? store.cart.some(
        (item) =>
          item.productId === product.id && item.variantLabel === variant.label,
      )
    : false;
  const needsChoice = product.variants.length > 1;

  return (
    <article className="group flex h-full flex-col rounded-3xl bg-white/70 p-3 ring-1 ring-[#e6dfd4] transition-shadow duration-300 hover:shadow-[0_24px_50px_-28px_rgba(110,80,40,0.45)]">
      <Link
        href={`/products/${product.slug}`}
        aria-label={`View ${product.name}`}
        className={`relative block aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-b from-[#faf7f2] to-[#efe4d2] ${FOCUS}`}
      >
        <Media
          src={image}
          alt={product.name}
          sizes="(min-width: 768px) 33vw, 74vw"
          className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <h3 className="text-lg font-medium leading-snug">{product.name}</h3>
        <p className="mt-1 text-sm text-[#6f675d]">{product.scent}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xl font-medium">
            {formatPrice(product.price)}
          </span>
          {needsChoice ? (
            <Link
              href={`/products/${product.slug}`}
              className={`inline-flex h-10 items-center rounded-full bg-[#CBAC7C] px-4 text-sm font-medium text-[#1c1b19] hover:bg-[#b39668] ${FOCUS}`}
            >
              Choose option
            </Link>
          ) : inCart ? (
            <button
              type="button"
              onClick={store.openCart}
              className={`inline-flex h-10 items-center gap-2 rounded-full border border-[#2c2926]/25 px-4 text-sm hover:bg-[#2c2926] hover:text-[#f7f3ee] ${FOCUS}`}
            >
              <Check size={15} /> In bag
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!variant) return;
                const result = store.addToCart(product.id, variant.label, 1);
                if (!result.ok && result.message) store.notify(result.message);
              }}
              className={`inline-flex h-10 items-center gap-2 rounded-full bg-[#2c2926] px-4 text-sm text-[#f7f3ee] transition-colors hover:bg-[#9a7352] active:scale-[0.98] ${FOCUS}`}
            >
              <ShoppingBag size={15} /> Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
