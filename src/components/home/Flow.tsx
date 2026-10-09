"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
        className="mt-8 h-12 bg-ink px-7 text-[11px] uppercase tracking-[0.2em] text-paper"
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
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  return (
    <section ref={ref} className="grid bg-cream md:grid-cols-2">
      <div className="relative min-h-[70vh] overflow-hidden">
        <motion.div style={{ y }} className="absolute inset-x-0 -top-[12%] h-[124%]">
          <Media src="/silknknot/candle2.webp" alt="A lit candle" sizes="50vw" className="object-contain" />
        </motion.div>
      </div>
      <div className="flex flex-col justify-center px-5 py-20 md:px-16 md:py-28">
        <Reveal>
          <p className="eyebrow text-mute">Our story</p>
          <h2 className="mt-4 font-serif text-5xl leading-[0.95] md:text-6xl">Made slowly, used daily.</h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-mute">
            Silk Knot began as a small studio ritual: slow formulas, honest scents, and objects meant to be used every day — not saved for later.
          </p>
          <Link href="/about" className="mt-8 inline-flex text-[11px] uppercase tracking-[0.18em]">
            Read the story
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section className="px-5 py-24 text-center md:py-36">
      <Reveal>
        <p className="eyebrow text-mute">The list</p>
        <h2 className="mt-4 font-serif text-5xl md:text-7xl">Notes on ritual.</h2>
        <p className="mx-auto mt-4 max-w-md text-mute">Seasonal scents, care notes, and the occasional quiet launch.</p>
        <form
          className="mx-auto mt-10 flex max-w-md items-end border-b border-ink text-left"
          onSubmit={(event) => {
            event.preventDefault();
            setDone(true);
            setEmail("");
          }}
        >
          <div className="flex-1">
            <label htmlFor="notes-email" className="sr-only">Email address</label>
            <input
              id="notes-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              autoComplete="email"
              className="h-14 w-full bg-transparent outline-none"
            />
          </div>
          <button type="submit" className="h-14 text-[11px] uppercase tracking-[0.18em]">
            Join
          </button>
        </form>
        {done ? <p className="mt-4 text-sm" role="status">You are on the list. We write rarely.</p> : null}
      </Reveal>
    </section>
  );
}
