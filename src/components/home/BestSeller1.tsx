"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { seedProducts } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { Media, Stars, WishlistButton } from "@/components/ui";

const shots = [
  "/silknknot/bestseller-butter.jpg",
  "/silknknot/bestseller-soap.jpg",
  "/silknknot/bestseller-candle.jpg",
];

export function BestSeller1() {
  const store = useStore();
  const catalog = (store.products.length ? store.products : seedProducts).filter((product) => product.active);
  const bestsellers = catalog.filter((product) => product.bestseller);
  const products = [...bestsellers, ...catalog.filter((product) => !product.bestseller)].slice(0, 8);
  const ref = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (!rowRef.current || !frameRef.current) return;
      setDistance(Math.max(0, rowRef.current.scrollWidth - frameRef.current.clientWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [products.length]);

  const x = useTransform(scrollYProgress, (value) => -distance * value);

  return (<>
  <section className="mt-6 bg-[#efeae3] px-6 py-10 md:hidden">
        <ShelfHeader />
        <div className="shelf-scroll mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {products.map((product, index) => (
            <ShelfCard key={product.id} product={product} image={shots[index % shots.length]} className="w-[78vw] shrink-0 snap-start" />
          ))}
        </div>
      </section>
      <section ref={ref} className="relative mt-6 hidden h-[165vh] bg-[#efeae3] md:block">
        <div ref={frameRef} className="sticky top-[var(--nav-h)] overflow-hidden py-6">
          <div className="px-8 pt-4">
            <ShelfHeader />
          </div>
          <motion.div
            ref={rowRef}
            style={{ x }}
            className="mt-10 flex w-max gap-5 px-8"
          >
            {products.map((product, index) => (
              <ShelfCard key={product.id} product={product} image={shots[index % shots.length]} className="w-[270px] shrink-0" />
            ))}
          </motion.div>
        </div>
      </section>
      </>
  );
}

function ShelfHeader() {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.24em] text-[#8a7350]">
          <span className="h-px w-8 bg-[#CBAC7C]" aria-hidden />
          Featured collection
        </p>
        <h2 className="mt-3 text-[2.35rem] font-medium leading-[1.05] tracking-[-0.03em] text-[#2c2926] md:text-6xl">
          Our Bestsellers
        </h2>
        <p className="mt-3 max-w-md text-base leading-relaxed text-[#6f675d] md:text-lg">
          Loved by many, crafted for you.
        </p>
      </div>
      <Link
        href="/shop?bestseller=1"
        className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#CBAC7C] bg-white px-5 py-2.5 text-sm text-[#2c2926] transition-colors duration-300 hover:bg-[#CBAC7C] hover:text-white"
      >
        View all products
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

function ShelfCard({ product, image, className }: { product: Product; image: string; className: string }) {
  const store = useStore();
  const variant = product.variants[0];
  const line = variant ? store.cart.find((item) => item.productId === product.id && item.variantLabel === variant.label) : undefined;
  const add = () => {
    if (!variant) return;
    const result = store.addToCart(product.id, variant.label, 1);
    if (!result.ok && result.message) store.notify(result.message);
  };

  return (
    <article className={`flex h-full flex-col rounded-2xl border border-[#ece6de] bg-white p-3 shadow-[0_10px_30px_rgba(44,41,38,0.04)] ${className}`}>
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden rounded-xl bg-[#f7f3ee]">
        <Media src={image} alt={product.name} sizes="270px" className="object-contain p-2" />
      </Link>
      <div className="mt-3 flex items-start gap-1">
        <h3 className="min-w-0 flex-1 text-[15px] font-medium leading-tight text-[#2c2926]">
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <WishlistButton productId={product.id} name={product.name} className="-mr-2 -mt-1" />
      </div>
      <p className="mt-1 text-sm text-[#8a8178]">{product.scent}</p>
      <p className="mt-2 flex items-center gap-2 text-xs text-[#8a8178]">
        <Stars rating={product.rating} />
        <span>
          {product.rating.toFixed(1)} ({product.reviewCount})
        </span>
      </p>
      <p className="mt-2 text-sm font-medium text-[#2c2926]">{formatPrice(product.price)}</p>
      {line ? (
        <button
          type="button"
          onClick={store.openCart}
          className="mt-3 h-11 w-full rounded-lg border border-mist-ink bg-white text-sm text-mist-ink transition-colors duration-300 hover:bg-[#CBAC7C] hover:text-white"
        >
          Go to cart
        </button>
      ) : (
        <button
          type="button"
          onClick={add}
          className="mt-3 h-11 w-full rounded-lg bg-[#CBAC7C] text-sm text-white transition-colors duration-300 hover:bg-[#B39668]"
        >
          Add to Cart
        </button>
      )}
    </article>
  );
}
