"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Plus } from "lucide-react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
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

// Desktop layout constants (used to work out where each card sits on screen)
const CARD_W = 280;
const GAP = 24;
const PAD = 48;

export function BestSeller2() {
  const store = useStore();
  const catalog = (
    store.products.length ? store.products : seedProducts
  ).filter((p) => p.active);
  const bestsellers = catalog.filter((p) => p.bestseller);
  const products = [
    ...bestsellers,
    ...catalog.filter((p) => !p.bestseller),
  ].slice(0, 8);

  const ref = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const [frameW, setFrameW] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const measure = () => {
      if (!rowRef.current || !frameRef.current) return;
      const fw = frameRef.current.clientWidth;
      setFrameW(fw);
      setDistance(Math.max(0, rowRef.current.scrollWidth - fw));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [products.length]);

  const x = useTransform(scrollYProgress, (v) => -distance * v);
  const barScale = useTransform(scrollYProgress, [0, 1], [0.04, 1]);

  return (
    <>
      {/* MOBILE + TABLET: native swipe carousel */}
      <section className="relative mt-6 overflow-hidden bg-[#efeae3] py-12 lg:hidden">
        <Glow />
        <div className="relative px-5 sm:px-8">
          <ShelfHeader />
        </div>
        <div className="shelf-scroll relative mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:px-8">
          {products.map((product, i) => (
            <div
              key={product.id}
              className="w-[72vw] max-w-[300px] shrink-0 snap-start sm:w-[44vw]"
            >
              <ShelfCard
                product={product}
                image={shots[i % shots.length]}
                rank={i + 1}
              />
            </div>
          ))}
        </div>
        <p className="relative mt-2 px-5 text-xs text-[#8a8178] sm:px-8">
          Swipe to see more
        </p>
      </section>

      {/* DESKTOP: pinned horizontal scroll with 3D depth */}
      <section
        ref={ref}
        className="relative mt-6 hidden h-[220vh] bg-[#efeae3] lg:block"
      >
        <div
          ref={frameRef}
          className="sticky top-[var(--nav-h)] flex h-[calc(100vh-var(--nav-h))] flex-col justify-center overflow-hidden"
        >
          <Glow />
          <div className="relative px-12">
            <ShelfHeader />
          </div>

          <div className="relative mt-10" style={{ perspective: 1400 }}>
            <motion.div
              ref={rowRef}
              style={{
                x,
                paddingLeft: PAD,
                paddingRight: PAD,
                gap: GAP,
                transformStyle: "preserve-3d",
              }}
              className="flex w-max py-6"
            >
              {products.map((product, i) => (
                <DepthSlot key={product.id} index={i} x={x} frameW={frameW}>
                  <ShelfCard
                    product={product}
                    image={shots[i % shots.length]}
                    rank={i + 1}
                    tilt
                  />
                </DepthSlot>
              ))}
            </motion.div>
          </div>

          {/* scroll progress */}
          <div className="relative mx-12 mt-6 h-[3px] overflow-hidden rounded-full bg-[#dcd3c6]">
            <motion.div
              style={{ scaleX: barScale }}
              className="h-full origin-left rounded-full bg-[#CBAC7C]"
            />
          </div>
        </div>
      </section>
    </>
  );
}

/** Soft background light so the section isn't flat */
function Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-[#CBAC7C]/20 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-white/70 blur-3xl" />
    </div>
  );
}

/** Rotates + scales each card based on how far it is from the centre of the screen */
function DepthSlot({
  index,
  x,
  frameW,
  children,
}: {
  index: number;
  x: MotionValue<number>;
  frameW: number;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();

  const rel = (xv: number) => {
    if (!frameW) return 0;
    const center = PAD + index * (CARD_W + GAP) + CARD_W / 2 + xv;
    return Math.max(-1, Math.min(1, (center - frameW / 2) / (frameW / 2)));
  };

  const rotateY = useTransform(x, (xv) => (reduce ? 0 : rel(xv) * 24));
  const scale = useTransform(x, (xv) =>
    reduce ? 1 : 1 - Math.abs(rel(xv)) * 0.1,
  );
  const opacity = useTransform(x, (xv) =>
    reduce ? 1 : 1 - Math.abs(rel(xv)) * 0.25,
  );

  return (
    <motion.div
      style={{
        rotateY,
        scale,
        opacity,
        width: CARD_W,
        transformStyle: "preserve-3d",
      }}
      className="shrink-0"
    >
      {children}
    </motion.div>
  );
}

function ShelfHeader() {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="flex items-center gap-3 text-sm font-medium text-[#8a7350]">
          <span className="h-px w-8 bg-[#CBAC7C]" aria-hidden />
          Featured collection
        </p>
        <h2 className="mt-3 text-[2.5rem] font-medium leading-[1.02] tracking-[-0.035em] text-[#2c2926] md:text-6xl lg:text-7xl">
          Our Bestsellers
        </h2>
        <p className="mt-3 max-w-md text-base leading-relaxed text-[#6f675d] md:text-lg">
          Loved by many, crafted for you.
        </p>
      </div>
      <Link
        href="/shop?bestseller=1"
        className="group inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#CBAC7C] bg-white px-6 py-3 text-sm text-[#2c2926] transition-colors duration-300 hover:bg-[#CBAC7C] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]"
      >
        View all products
        <ArrowRight
          size={16}
          className="transition-transform duration-300 group-hover:translate-x-1"
        />
      </Link>
    </div>
  );
}

function ShelfCard({
  product,
  image,
  rank,
  tilt = false,
}: {
  product: Product;
  image: string;
  rank: number;
  tilt?: boolean;
}) {
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

  // Hover tilt (mouse only, disabled for touch + reduced motion)
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 18, mass: 0.6 };
  const rotateX = useSpring(useTransform(my, [0, 1], [9, -9]), spring);
  const rotateY = useSpring(useTransform(mx, [0, 1], [-9, 9]), spring);
  const glare = useTransform(
    [mx, my],
    ([a, b]: number[]) =>
      `radial-gradient(circle at ${a * 100}% ${b * 100}%, rgba(255,255,255,0.65), rgba(255,255,255,0) 55%)`,
  );
  const glareOpacity = useMotionValue(0);

  const canTilt = tilt && !reduce;

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!canTilt || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
    glareOpacity.set(1);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
    glareOpacity.set(0);
  };

  return (
    <motion.article
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={
        canTilt
          ? {
              rotateX,
              rotateY,
              transformPerspective: 900,
              transformStyle: "preserve-3d",
            }
          : undefined
      }
      className="group relative flex h-full flex-col rounded-[28px] border border-white/80 bg-white/90 p-3 shadow-[0_20px_50px_-20px_rgba(44,41,38,0.25)] backdrop-blur"
    >
      {/* image stage */}
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden rounded-[20px] bg-gradient-to-b from-[#faf7f2] to-[#eee6da] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8a7350]"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* floor shadow */}
        <span
          aria-hidden
          className="absolute bottom-[10%] left-1/2 h-4 w-3/5 -translate-x-1/2 rounded-[50%] bg-[#2c2926]/20 blur-lg transition-all duration-500 group-hover:w-2/3 group-hover:bg-[#2c2926]/25"
        />
        {/* product pops forward in 3D */}
        <div
          className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          style={canTilt ? { transform: "translateZ(50px)" } : undefined}
        >
          <Media
            src={image}
            alt={product.name}
            sizes="280px"
            className="object-contain p-4"
          />
        </div>

        {product.bestseller && (
          <span className="absolute left-3 top-3 rounded-full bg-[#2c2926] px-3 py-1 text-xs font-medium text-[#f3e7d1]">
            Bestseller
          </span>
        )}
        <span
          aria-hidden
          className="absolute bottom-3 right-4 font-serif text-5xl leading-none text-[#CBAC7C]/40"
        >
          {String(rank).padStart(2, "0")}
        </span>

        {canTilt && (
          <motion.span
            aria-hidden
            style={{ background: glare, opacity: glareOpacity }}
            className="pointer-events-none absolute inset-0 mix-blend-soft-light transition-opacity duration-300"
          />
        )}
      </Link>

      {/* info */}
      <div
        className="flex flex-1 flex-col px-1 pb-1 pt-4"
        style={canTilt ? { transform: "translateZ(24px)" } : undefined}
      >
        <div className="flex items-start gap-1">
          <h3 className="min-w-0 flex-1 text-base font-medium leading-snug text-[#2c2926]">
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>
          <WishlistButton
            productId={product.id}
            name={product.name}
            className="-mr-2 -mt-1"
          />
        </div>
        <p className="mt-1 text-sm text-[#8a8178]">{product.scent}</p>
        <p className="mt-2 flex items-center gap-2 text-xs text-[#8a8178]">
          <Stars rating={product.rating} />
          <span>
            {product.rating.toFixed(1)} ({product.reviewCount})
          </span>
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <p className="text-lg font-medium text-[#2c2926]">
            {formatPrice(product.price)}
          </p>
          {line ? (
            <button
              type="button"
              onClick={store.openCart}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[#CBAC7C] bg-white px-4 text-sm text-[#2c2926] transition-colors duration-300 hover:bg-[#CBAC7C] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]"
            >
              <Check size={16} />
              Go to cart
            </button>
          ) : (
            <button
              type="button"
              onClick={add}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#CBAC7C] pl-4 pr-5 text-sm font-medium text-white transition-all duration-300 hover:bg-[#B39668] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]"
            >
              <Plus size={16} />
              Add
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
