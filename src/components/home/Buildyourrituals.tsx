"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { seedProducts } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { useSiteMedia } from "@/lib/site-media/client";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { Media } from "@/components/ui";

/**
 * The ritual, in the order you actually use it. Each step picks the best-rated
 * product whose name or type matches. Edit the patterns to match your catalogue.
 */
const STEPS = [
  {
    label: "Soak",
    line: "Start with minerals in the bath.",
    match: /salt|soak|bath/i,
  },
  { label: "Polish", line: "A scrub to soften and smooth.", match: /scrub/i },
  {
    label: "Soften",
    line: "Butter for the hour after bathing.",
    match: /butter/i,
  },
  {
    label: "Settle",
    line: "A candle for the last hour of the day.",
    match: /candle/i,
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

export function BuildYourRitual() {
  const media = useSiteMedia();
  const fallbackShots = [media.bestsellerButter, media.bestsellerSoap, media.bestsellerCandle];
  const store = useStore();
  const catalog = (
    store.products.length ? store.products : seedProducts
  ).filter((p) => p.active);

  const picks = STEPS.map((step) => {
    const product = catalog
      .filter((p) =>
        step.match.test(
          `${p.name} ${(p as unknown as { type?: string }).type ?? ""}`,
        ),
      )
      .sort((a, b) => b.rating - a.rating)[0];
    return product ? { step, product } : null;
  }).filter(
    (item): item is { step: (typeof STEPS)[number]; product: Product } =>
      item !== null,
  );

  if (picks.length < 3) return null;

  const total = picks.reduce((sum, { product }) => sum + product.price, 0);

  const addAll = () => {
    let failed: string | undefined;
    for (const { product } of picks) {
      const variant = product.variants[0];
      if (!variant) continue;
      const result = store.addToCart(product.id, variant.label, 1);
      if (!result.ok && result.message) failed = result.message;
    }
    if (failed) store.notify(failed);
    store.openCart();
  };

  return (
    <section
      className="bg-[#efe5d6] text-[#2c2926]"
      aria-label="Build your ritual"
    >
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 md:py-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-4xl font-medium leading-[1.05] tracking-[-0.035em] md:text-5xl">
              Build your evening ritual
            </h2>
            <p className="mt-2 max-w-md text-base text-[#6f675d]">
              Four steps, in the order that works. Take them all or pick your
              own.
            </p>
          </div>
          <button
            type="button"
            onClick={addAll}
            className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2c2926] px-7 text-base text-[#f7f3ee] transition-colors hover:bg-[#9a7352] active:scale-[0.98] md:w-auto ${FOCUS}`}
          >
            <ShoppingBag size={18} />
            Add the whole ritual · {formatPrice(total)}
          </button>
        </div>

        <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
          {/* the line that joins the steps */}
          <span
            aria-hidden
            className="absolute left-[1.15rem] top-3 bottom-3 w-px bg-[#CBAC7C]/60 md:left-6 md:right-6 md:top-[1.15rem] md:h-px md:w-auto"
          />
          {picks.map(({ step, product }, i) => (
            <li key={step.label} className="relative pl-14 md:pl-0">
              <span className="absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full bg-[#2c2926] text-sm text-[#f7f3ee] md:relative md:mb-5">
                {i + 1}
              </span>
              <p className="text-2xl font-medium tracking-[-0.02em]">
                {step.label}
              </p>
              <p className="mt-1 text-sm text-[#6f675d]">{step.line}</p>

              <Link
                href={`/products/${product.slug}`}
                className={`group mt-4 flex items-center gap-4 rounded-2xl bg-white/70 p-3 ring-1 ring-[#e6dfd4] transition-shadow hover:shadow-[0_20px_40px_-26px_rgba(110,80,40,0.5)] md:flex-col md:items-stretch md:gap-0 md:p-3 ${FOCUS}`}
              >
                <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-b from-[#faf7f2] to-[#efe4d2] md:aspect-square md:h-auto md:w-full">
                  <Media
                    src={productImage(product, i, fallbackShots)}
                    alt=""
                    sizes="(min-width: 768px) 25vw, 80px"
                    className="object-contain p-2 transition-transform duration-500 group-hover:scale-105 md:p-5"
                  />
                </span>
                <span className="min-w-0 md:px-1 md:pb-1 md:pt-3">
                  <span className="block text-[15px] font-medium leading-snug">
                    {product.name}
                  </span>
                  <span className="mt-0.5 block text-sm text-[#8a7350]">
                    {formatPrice(product.price)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
