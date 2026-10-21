"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ritualBuilderSteps, seedProducts } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Media, PriceTag, Reveal, Stars } from "@/components/ui";
import { ProductCard } from "@/components/product/ProductCard";

const showcaseIds = ["silk-veil-body-butter", "atelier-milk-soap", "quiet-hour-candle"];
const storyIds = ["silk-veil-body-butter", "atelier-milk-soap", "palm-sugar-scrub", "mineral-bath-salts", "quiet-hour-candle"];

function pickProducts(products: typeof seedProducts, ids: string[]) {
  return ids
    .map((id) => products.find((item) => item.id === id) ?? seedProducts.find((item) => item.id === id))
    .filter((item): item is (typeof seedProducts)[number] => Boolean(item));
}

export function ProductShowcase() {
  const store = useStore();
  const products = pickProducts(store.products, showcaseIds);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <>
      <section className="bg-[#f3eee6] px-5 py-20 md:hidden">
        <p className="eyebrow text-mute">In focus</p>
        <h2 className="mt-3 font-serif text-5xl">One object at a time.</h2>
        <div className="mt-10 space-y-16">
          {products.map((product) => (
            <ShowcaseCopy key={product.id} product={product} />
          ))}
        </div>
      </section>
      <section ref={ref} className="relative hidden h-[320vh] bg-[#f3eee6] md:block">
        <div className="sticky top-0 grid h-screen grid-cols-2">
          <div className="relative overflow-hidden">
            {products.map((product, index) => (
              <ShowcaseVisual key={product.id} product={product} index={index} progress={scrollYProgress} />
            ))}
          </div>
          <div className="relative">
            {products.map((product, index) => (
              <Fading key={product.id} index={index} progress={scrollYProgress} className="absolute inset-0 flex items-center px-16">
                <ShowcaseCopy product={product} />
              </Fading>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ShowcaseVisual({
  product,
  index,
  progress,
}: {
  product: (typeof seedProducts)[number];
  index: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const y = useTransform(progress, (value) => (value * 3 - index) * 24);
  return (
    <Fading index={index} progress={progress} className="absolute inset-0">
      <motion.div style={{ y }} className="absolute inset-[-8%]">
        <Media src={product.images[0]} alt={product.name} sizes="50vw" className="object-contain" />
      </motion.div>
    </Fading>
  );
}

function Fading({
  index,
  progress,
  className,
  children,
}: {
  index: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  className?: string;
  children: React.ReactNode;
}) {
  const opacity = useTransform(progress, (value) => {
    const start = index / 3;
    const end = (index + 1) / 3;
    if (value >= start && value < end) return 1;
    if (value >= start - 0.08 && value < start) return (value - (start - 0.08)) / 0.08;
    if (value >= end && value < end + 0.08) return 1 - (value - end) / 0.08;
    return 0;
  });
  return (
    <motion.div style={{ opacity }} className={className}>
      {children}
    </motion.div>
  );
}

function ShowcaseCopy({ product }: { product: (typeof seedProducts)[number] }) {
  const store = useStore();
  return (
    <div>
      <p className="eyebrow text-mute">{product.type}</p>
      <h3 className="mt-3 font-serif text-5xl md:text-6xl">{product.name}</h3>
      <p className="mt-4 max-w-sm text-lg text-mute">{product.shortDescription}</p>
      <div className="mt-6 flex items-center gap-4">
        <PriceTag price={product.price} compare={product.compareAtPrice} />
        <Stars rating={product.rating} />
      </div>
      <button
        type="button"
        className="mt-8 h-12 bg-[#CBAC7C] px-7 text-[11px] uppercase tracking-[0.2em] text-white hover:bg-[#B39668]"
        onClick={() => {
          const result = store.addToCart(product.id, product.variants[0].label, 1);
          if (result.message) store.notify(result.message);
        }}
      >
        Add to cart
      </button>
    </div>
  );
}

export function HorizontalStory() {
  const store = useStore();
  const products = pickProducts(store.products, storyIds);
  const ref = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (!rowRef.current) return;
      setDistance(Math.max(0, rowRef.current.scrollWidth - window.innerWidth + 80));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const x = useTransform(scrollYProgress, (value) => -distance * value);

  return (
    <>
      <section className="bg-ink py-16 text-paper md:hidden">
        <div className="px-5">
          <p className="eyebrow text-paper/50">In the hand</p>
          <h2 className="mt-3 font-serif text-5xl">From cleanse to quiet.</h2>
        </div>
        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4">
          {products.map((product) => (
            <StoryCard key={product.id} product={product} className="w-[78vw] shrink-0 snap-start" />
          ))}
        </div>
      </section>
      <section ref={ref} className="relative hidden h-[280vh] bg-ink text-paper md:block">
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
          <div className="px-[8vw]">
            <p className="eyebrow text-paper/50">In the hand</p>
            <h2 className="mt-3 font-serif text-6xl">From cleanse to quiet.</h2>
          </div>
          <motion.div ref={rowRef} style={{ x }} className="mt-12 flex w-max gap-6 pl-[8vw] pr-[12vw]">
            {products.map((product) => (
              <StoryCard key={product.id} product={product} className="w-[32vw]" />
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
}

function StoryCard({ product, className }: { product: (typeof seedProducts)[number]; className: string }) {
  return (
    <article className={className}>
      <Link href={`/products/${product.slug}`} className="relative block aspect-[3/4] overflow-hidden bg-cream">
        <Media src={product.images[0]} alt={product.name} sizes="32vw" className="object-contain" />
      </Link>
      <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-paper/50">{product.type}</p>
      <h3 className="mt-2 font-serif text-4xl">{product.name}</h3>
      <p className="mt-2 max-w-xs text-sm text-paper/70">{product.shortDescription}</p>
    </article>
  );
}

export function RitualBuilder() {
  const store = useStore();
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(ritualBuilderSteps.map((step) => [step.id, step.productIds[0]])),
  );
  const chosen = ritualBuilderSteps
    .map((step) => store.products.find((item) => item.id === selected[step.id]) ?? seedProducts.find((item) => item.id === selected[step.id]))
    .filter((item): item is (typeof seedProducts)[number] => Boolean(item));
  const total = chosen.reduce((sum, product) => sum + product.price, 0);

  return (
    <section className="bg-paper px-5 py-24 md:px-10 md:py-36">
      <Reveal>
        <p className="eyebrow text-mute">Compose</p>
        <h2 className="mt-3 font-serif text-5xl md:text-7xl">Build your ritual.</h2>
      </Reveal>
      <div className="mt-14 grid gap-12 lg:grid-cols-[1.5fr_0.7fr]">
        <ol className="space-y-12">
          {ritualBuilderSteps.map((step) => (
            <li key={step.id}>
              <p className="font-serif text-5xl text-stone">{step.index}</p>
              <h3 className="font-serif text-4xl">{step.title}</h3>
              <p className="mt-2 text-mute">{step.copy}</p>
              <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
                {step.productIds.map((id) => {
                  const product = store.products.find((item) => item.id === id) ?? seedProducts.find((item) => item.id === id);
                  if (!product) return null;
                  const active = selected[step.id] === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelected((current) => ({ ...current, [step.id]: id }))}
                      className={`w-36 shrink-0 text-left ${active ? "opacity-100" : "opacity-60"}`}
                    >
                      <span className={`relative block aspect-[4/5] bg-cream ${active ? "outline outline-1 outline-ink" : ""}`}>
                        <Media src={product.images[0]} alt="" sizes="144px" />
                      </span>
                      <span className="mt-2 block text-sm">{product.name}</span>
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
        <aside className="h-fit bg-cream p-6 md:p-8 lg:sticky lg:top-24">
          <p className="eyebrow text-mute">Your ritual</p>
          <ul className="mt-6 space-y-4">
            {chosen.map((product) => (
              <li key={product.id} className="flex items-center gap-3">
                <span className="relative block h-16 w-14 shrink-0 bg-paper">
                  <Media src={product.images[0]} alt="" sizes="56px" />
                </span>
                <span>
                  <span className="block">{product.name}</span>
                  <span className="text-sm text-mute">{formatPrice(product.price)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex items-baseline justify-between">
            <span className="eyebrow text-mute">Together</span>
            <span className="font-serif text-3xl">{formatPrice(total)}</span>
          </p>
          <button
            type="button"
            className="mt-6 h-12 w-full bg-ink text-[11px] uppercase tracking-[0.2em] text-paper"
            onClick={() => {
              const messages: string[] = [];
              chosen.forEach((product) => {
                const result = store.addToCart(product.id, product.variants[0].label, 1);
                if (!result.ok && result.message) messages.push(result.message);
              });
              store.notify(messages[0] || "Ritual added to bag");
              store.openCart();
            }}
          >
            Add ritual to cart
          </button>
        </aside>
      </div>
    </section>
  );
}

export function BestSellers() {
  const store = useStore();
  const products = (store.products.length ? store.products : seedProducts).filter((product) => product.bestseller && product.active);
  return (
    <section className="bg-[#fbf9f6] px-5 py-24 md:px-10 md:py-32">
      <Reveal className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-mute">Most loved</p>
          <h2 className="mt-3 font-serif text-5xl md:text-7xl">Best sellers</h2>
        </div>
        <Link href="/shop?bestseller=1" className="text-[11px] uppercase tracking-[0.18em]">
          View all
        </Link>
      </Reveal>
      <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-8">
        {products.map((product, index) => (
          <Reveal key={product.id} delay={index * 0.06}>
            <ProductCard product={product} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function BrandStory() {
  return (
    <section className="mt-6 hidden bg-[#fbf9f6] px-5 py-8 md:block md:px-8 md:py-10">
      <div className="site-container grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-[#e7dfd4]">
          <Media src="/silknknot/bestseller-candle.jpg" alt="A Silken Knot candle" sizes="(min-width: 768px) 46vw, 90vw" className="object-cover" />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#8a8178]">Our story</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight text-[#2c2926] md:text-5xl">Made slowly, used daily.</h2>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-[#5e574e]">
            Silken Knot began as a small studio ritual: slow formulas, honest scents, and objects meant to be used every day — not saved for later.
          </p>
          <Link href="/about" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#CBAC7C] px-6 py-3 text-sm text-white transition-colors duration-300 hover:bg-[#B39668]">
            Read the story
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section className="relative mt-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <Media src="/silknknot/collection-lifestyle-wide.jpg" alt="" sizes="100vw" className="object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-white/5 md:bg-gradient-to-r md:from-white/55 md:via-white/25 md:to-transparent" />
      <div className="site-container relative z-10 flex flex-col items-center gap-6 px-6 py-12 text-center md:gap-10 md:px-8 md:py-20">
        <div className="w-full">
          <h2 className="text-[1.85rem] leading-tight text-[#2c2926] md:text-5xl">Join the Silken Knot list</h2>
          <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[#2c2926] md:text-[15px] md:text-[#4e4943]">
            Be the first to know about new arrivals, care notes, and quiet launches.
          </p>
        </div>
        <form
          className="flex w-full max-w-xl flex-col gap-4 md:flex-row md:items-center md:gap-0 md:rounded-full md:border md:border-black/15 md:bg-white md:p-1.5 md:focus-within:border-black/40 md:focus-within:shadow-[0_0_0_1px_rgba(0,0,0,0.28)]"
          onSubmit={(event) => {
            event.preventDefault();
            setDone(true);
            setEmail("");
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          }}
        >
          <label htmlFor="notes-email" className="sr-only">Email address</label>
          <div className="subscribe-field w-full rounded-full border border-black/15 bg-white md:contents">
            <input
              id="notes-email"
              type="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (done) setDone(false);
              }}
              placeholder="Your email address"
              autoComplete="email"
              className="h-16 w-full min-w-0 flex-1 cursor-text bg-transparent px-5 text-base text-[#2c2926] outline-none focus:outline-none focus-visible:outline-none md:h-12 md:px-5 md:text-sm"
            />
          </div>
          <button
            type="submit"
            className={`h-14 w-full shrink-0 rounded-full px-6 text-base text-white transition-colors duration-300 md:h-12 md:w-auto md:text-sm ${done ? "bg-[#B39668]" : "bg-[#CBAC7C] hover:bg-[#B39668]"}`}
          >
            {done ? "Subscribed" : "Subscribe"}
          </button>
        </form>
      </div>
    </section>
  );
}
