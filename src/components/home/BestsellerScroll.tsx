"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ShoppingBag } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
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

const INTERVAL = 4000; // ms per product when autoplaying

export function BestsellerScroll() {
  const store = useStore();
  const reduce = useReducedMotion();
  const catalog = (
    store.products.length ? store.products : seedProducts
  ).filter((p) => p.active);
  const bestsellers = catalog.filter((p) => p.bestseller);
  const products = [
    ...bestsellers,
    ...catalog.filter((p) => !p.bestseller),
  ].slice(0, 6);

  const [active, setActive] = useState(0);

  useEffect(() => {
    if (products.length < 2) return;
    const timer = window.setTimeout(() => {
      setActive((value) => (value + 1) % products.length);
    }, INTERVAL);
    return () => window.clearTimeout(timer);
  }, [active, products.length]);

  if (!products.length) return null;
  const index = Math.min(active, products.length - 1);
  const product = products[index];
  const image = shots[index % shots.length];

  return (
    <section
      className="relative overflow-hidden bg-[#e7dccb] text-[#2c2926]"
    >
      {/* ambient light */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-[#CBAC7C]/25 blur-[100px]" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-white/40 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 md:py-10">
        {/* header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-4xl font-medium leading-[1.05] tracking-[-0.035em] text-[#2c2926] md:text-5xl">
              Our Bestsellers
            </h2>
            <p className="mt-2 text-base text-[#6f675d]">
              Loved by many, crafted for you.
            </p>
          </div>
          <Link
            href="/shop?bestseller=1"
            className="group inline-flex w-fit items-center gap-2 rounded-full border border-[#2c2926]/20 px-5 py-2.5 text-sm text-[#2c2926] transition-colors duration-300 hover:bg-[#2c2926] hover:text-[#f7f3ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]"
          >
            View all products
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </div>

        {/* spotlight */}
        <div className="mt-6 grid items-center gap-6 lg:grid-cols-2 lg:gap-8">
          <Stage product={product} image={image} />
          <Info product={product} rank={index + 1} />
        </div>

        {/* selector */}
        <div
          role="tablist"
          aria-label="Choose a bestseller"
          className="shelf-scroll -mx-5 mt-6 flex snap-x gap-3 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0"
        >
          {products.map((p, i) => {
            const isActive = i === index;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(i)}
                className={`relative flex w-[180px] shrink-0 snap-start items-center gap-3 overflow-hidden rounded-2xl border p-2 text-left text-[#2c2926] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350] lg:w-auto lg:min-w-0 lg:flex-1 ${
                  isActive
                    ? "border-[#CBAC7C] bg-white/70"
                    : "border-[#2c2926]/10 bg-white/35 hover:border-[#CBAC7C]/70"
                }`}
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f7f3ee]">
                  <Media
                    src={shots[i % shots.length]}
                    alt=""
                    sizes="56px"
                    className="object-contain p-1"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {p.name}
                  </span>
                  <span className="mt-0.5 block text-sm text-[#8a7350]">
                    {formatPrice(p.price)}
                  </span>
                </span>
                {isActive && !reduce && (
                  <motion.span
                    key={index}
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-[#CBAC7C]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: INTERVAL / 1000,
                      ease: "linear",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Big glowing product stage: floats, tilts with the mouse, and the whole thing is a link */
function Stage({ product, image }: { product: Product; image: string }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const spring = { stiffness: 140, damping: 16, mass: 0.7 };
  const rotateX = useSpring(useTransform(my, [0, 1], [10, -10]), spring);
  const rotateY = useSpring(useTransform(mx, [0, 1], [-12, 12]), spring);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <div
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative mx-auto aspect-square w-full max-w-[240px] sm:max-w-[320px] lg:max-w-[380px]"
      style={{ perspective: 1100 }}
    >
      {/* rings + disc */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full border border-[#CBAC7C]/25"
      />
      <div
        aria-hidden
        className="absolute inset-[6%] rounded-full border border-dashed border-[#CBAC7C]/30"
      />
      <div
        aria-hidden
        className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_30%_25%,#f4e6c8,#CBAC7C_55%,#8f7345)] shadow-[0_40px_90px_-20px_rgba(203,172,124,0.55)]"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={product.id}
          initial={
            reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, rotate: -8 }
          }
          animate={
            reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }
          }
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotate: 6 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <motion.div
            style={
              reduce
                ? undefined
                : { rotateX, rotateY, transformStyle: "preserve-3d" }
            }
            className="h-full w-full"
          >
            <motion.div
              animate={reduce ? undefined : { y: [0, -14, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-full"
            >
              <Link
                href={`/products/${product.slug}`}
                aria-label={`View ${product.name}`}
                className="relative block h-full w-full rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#CBAC7C]"
              >
                <Media
                  src={image}
                  alt={product.name}
                  sizes="(min-width: 1024px) 520px, 90vw"
                  className="object-contain p-[14%] drop-shadow-[0_30px_30px_rgba(0,0,0,0.35)]"
                />
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* price badge */}
      <AnimatePresence mode="wait">
        <motion.div
          key={product.id}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="pointer-events-none absolute -bottom-1 right-0 flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#f5ede1] text-[#1d1915] shadow-xl sm:h-28 sm:w-28"
        >
          <span className="text-xs text-[#6f675d]">Only</span>
          <span className="text-lg font-semibold leading-tight sm:text-xl">
            {formatPrice(product.price)}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Info({ product, rank }: { product: Product; rank: number }) {
  const store = useStore();
  const reduce = useReducedMotion();
  const variant = product.variants[0];
  const line = variant
    ? store.cart.find(
        (item) =>
          item.productId === product.id && item.variantLabel === variant.label,
      )
    : undefined;

  const add = () => {
    if (!variant) return;
    const result = store.addToCart(product.id, variant.label, 1);
    if (!result.ok && result.message) store.notify(result.message);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={product.id}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, x: -20 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="text-center lg:text-left"
      >
        <p className="inline-flex items-center gap-2 rounded-full bg-[#CBAC7C]/25 px-3 py-1 text-sm font-medium text-[#6b5433]">
          {product.bestseller ? `Bestseller no. ${rank}` : `Customer favourite`}
        </p>

        <h3 className="mt-3 text-3xl font-medium leading-[1.08] tracking-[-0.03em] text-[#2c2926] sm:text-4xl">
          <Link
            href={`/products/${product.slug}`}
            className="transition-colors duration-300 hover:text-[#8a7350]"
          >
            {product.name}
          </Link>
        </h3>

        <p className="mt-2 text-base text-[#6f675d]">{product.scent}</p>

        <p className="mt-3 flex items-center justify-center gap-2 text-sm text-[#6f675d] lg:justify-start">
          <Stars rating={product.rating} />
          <span>
            {product.rating.toFixed(1)} from {product.reviewCount} reviews
          </span>
        </p>

        <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
          <Link
            href={`/products/${product.slug}`}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#CBAC7C] px-6 text-base font-medium text-[#1c1b19] transition-colors duration-300 hover:bg-[#b39668] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]"
          >
            Shop now
            <ArrowRight
              size={18}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>

          {line ? (
            <button
              type="button"
              onClick={store.openCart}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#2c2926]/20 px-5 text-base text-[#2c2926] transition-colors duration-300 hover:bg-[#2c2926] hover:text-[#f7f3ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]"
            >
              <Check size={18} />
              Go to cart
            </button>
          ) : (
            <button
              type="button"
              onClick={add}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#2c2926]/20 px-5 text-base text-[#2c2926] transition-colors duration-300 hover:border-[#2c2926] hover:bg-white/50 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]"
            >
              <ShoppingBag size={18} />
              Add to cart
            </button>
          )}

          <WishlistButton
            productId={product.id}
            name={product.name}
            className="self-center text-[#2c2926]"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
