"use client";

import Link from "next/link";
import { Heart, Leaf, Recycle, Sparkles } from "lucide-react";
import { seedProducts } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { Media } from "@/components/ui";

const notes = [
  { icon: Leaf, title: "Simple formulas", copy: "Butters, sugars, salts, and wax — named on the label." },
  { icon: Heart, title: "Made in small batches", copy: "Poured and whipped so each jar stays consistent." },
  { icon: Sparkles, title: "Made to rinse clean", copy: "A finish you can dress in, not a film on the skin." },
  { icon: Recycle, title: "Quiet scents", copy: "Fragrance that stays in the room, not on your clothes." },
];

export function Bestsellers() {
  const products = useCatalog().filter((product) => product.bestseller).slice(0, 4);
  return (
    <section className="bg-[#f7f4ef] px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-[1200px]">
        <ShelfHeader
          kicker="Loved by many"
          title="Our bestsellers"
          href="/shop?bestseller=1"
          link="View all products"
        />
        <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {products.map((product) => (
            <li key={product.id}>
              <ShelfCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PromiseBand() {
  return (
    <section className="bg-[#f7f4ef] px-5 py-8 md:px-10 md:py-14">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className="relative aspect-[5/4] overflow-hidden rounded-[1.6rem] bg-[#e7dfd4] p-8">
          <div className="relative h-full w-full">
            <Media src="/silknknot/body_butter.jpg" alt="Body butter" sizes="(min-width: 768px) 46vw, 90vw" className="object-contain" />
          </div>
        </div>
        <div>
          <p className="text-[12px] uppercase tracking-[0.22em] text-[#6f675d]">Why Silk Knot</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight text-[#2c2926] md:text-5xl">Care you can use every day.</h2>
          <p className="mt-4 max-w-md leading-7 text-[#5e574e]">
            The bath is the first step. What follows should feel soft, rinse clean, and be ready before you get dressed.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-6">
            {notes.map((note) => (
              <li key={note.title}>
                <note.icon size={22} strokeWidth={1.4} />
                <p className="mt-3 text-sm font-medium">{note.title}</p>
                <p className="mt-1 text-sm leading-6 text-[#5e574e]">{note.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Collections() {
  const store = useStore();
  const categories = store.categories.length ? store.categories : [];
  return (
    <section className="bg-[#f7f4ef] px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-[1200px]">
        <p className="text-[12px] uppercase tracking-[0.22em] text-[#6f675d]">Find your favorite</p>
        <h2 className="mt-3 font-serif text-4xl text-[#2c2926] md:text-5xl">Explore our collections</h2>
        <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/shop?category=${category.id}`} className="group block">
                <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-[#e7dfd4]">
                  <Media
                    src={category.image}
                    alt=""
                    sizes="(min-width: 768px) 22vw, 46vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </span>
                <span className="mt-3 block text-center text-sm">{category.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Moment() {
  return (
    <section className="bg-[#f7f4ef] px-5 py-8 md:px-10 md:py-14">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className="relative aspect-[5/4] overflow-hidden rounded-[1.6rem] bg-[#e7dfd4]">
          <Media src="/silknknot/candle1.jpg" alt="A Silk Knot candle" sizes="(min-width: 768px) 46vw, 90vw" className="object-cover" />
        </div>
        <div>
          <p className="text-[12px] uppercase tracking-[0.22em] text-[#6f675d]">Make it a ritual</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight text-[#2c2926] md:text-5xl">
            Turn the last hour into something quiet
          </h2>
          <p className="mt-4 max-w-md leading-7 text-[#5e574e]">
            From the first rinse to the candle you light after, the routine is short enough to keep. Start with a bestseller, or build the full bath.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex rounded-full bg-[#243028] px-6 py-3 text-sm text-white transition-colors duration-300 hover:bg-[#1a2420]"
          >
            Shop all care
          </Link>
        </div>
      </div>
    </section>
  );
}

export function MoreToTry() {
  const products = useCatalog().slice(0, 6);
  return (
    <section className="bg-[#f7f4ef] px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-[1200px]">
        <ShelfHeader kicker="Top picks" title="Best sellers" href="/shop" link="View all" />
        <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6 lg:gap-5">
          {products.map((product) => (
            <li key={product.id}>
              <ShelfCard product={product} compact />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ShelfHeader({ kicker, title, href, link }: { kicker: string; title: string; href: string; link: string }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <p className="text-[12px] uppercase tracking-[0.22em] text-[#6f675d]">{kicker}</p>
        <h2 className="mt-2 font-serif text-4xl text-[#2c2926] md:text-5xl">{title}</h2>
      </div>
      <Link href={href} className="shrink-0 text-sm text-[#3c3834] underline-offset-4 hover:underline">
        {link}
      </Link>
    </div>
  );
}

function ShelfCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const store = useStore();
  const variant = product.variants[0];
  const add = () => {
    if (!variant) return;
    const result = store.addToCart(product.id, variant.label, 1);
    if (result.ok) store.openCart();
    else if (result.message) store.notify(result.message);
  };
  return (
    <article className="flex h-full flex-col">
      <Link href={`/products/${product.slug}`} className={`relative block overflow-hidden rounded-2xl bg-[#efe8df] ${compact ? "aspect-square" : "aspect-[4/5]"}`}>
        <Media src={product.images[0]} alt={product.name} sizes={compact ? "16vw" : "24vw"} className="object-contain" />
      </Link>
      <h3 className={`mt-3 font-medium leading-tight text-[#2c2926] ${compact ? "text-sm" : "text-base"}`}>
        <Link href={`/products/${product.slug}`}>{product.name}</Link>
      </h3>
      <p className="mt-1 text-sm text-[#6f675d]">{product.type}</p>
      <p className="mt-1 text-sm">{formatPrice(product.price)}</p>
      <button
        type="button"
        onClick={add}
        className="mt-3 h-10 rounded-full bg-[#243028] text-sm text-white transition-colors duration-300 hover:bg-[#1a2420]"
      >
        Add to cart
      </button>
    </article>
  );
}

function useCatalog() {
  const store = useStore();
  const products = store.products.length ? store.products : seedProducts;
  return products.filter((product) => product.active);
}
