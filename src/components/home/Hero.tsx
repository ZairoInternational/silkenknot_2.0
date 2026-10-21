"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Bath, Flame, Flower2 } from "lucide-react";
import { Media, ease, usePrefersReducedMotion } from "@/components/ui";
import { heroBackdrops, setHeroNav } from "@/lib/hero-nav";

const saleCategories = [
  { label: "Soap", href: "/shop?category=bath-soap", icon: SoapIcon },
  { label: "Sugar scrub", href: "/shop?type=Sugar%20Scrub", icon: Flower2 },
  { label: "Candles", href: "/shop?category=aromatherapy", icon: Flame },
  { label: "Body butter", href: "/shop?type=Body%20Butter", icon: JarIcon },
  { label: "Bath", href: "/shop?category=bath-soap", icon: Bath },
];

const features = [
  {
    src: "/silknknot/body_butter.jpg",
    label: "Body butter",
    kicker: "Body butter",
    title: "A butter that",
    accent: "melts on warm skin.",
    note: "Shea and murumuru for the hour after bathing, with a finish that lets you dress.",
    href: "/shop?category=body-care",
  },
  {
    src: "/silknknot/sugar_scrap1.jpg",
    label: "Sugar scrub",
    kicker: "Sugar scrub",
    title: "A polish for",
    accent: "arms, legs, and shoulders.",
    note: "The grains soften as you massage, so skin feels smooth rather than stripped.",
    href: "/shop?category=body-care",
  },
  {
    src: "/silknknot/bath_salts1.jpg",
    label: "Bath salts",
    kicker: "Bath salts",
    title: "Minerals for",
    accent: "the soak itself.",
    note: "Pour them in before the butter. The bath is the first step, not a scent in the room.",
    href: "/shop?category=bath-soap",
  },
];

const marquee = ["Body butter", "Bath soap", "Sugar scrub", "Candles"];
const slideCount = features.length + 1;

function SoapIcon({ size = 22, strokeWidth: _strokeWidth }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="7" y="9" width="12" height="9" rx="2.5" />
      <path d="M9 9V7.5A2.5 2.5 0 0 1 11.5 5H14" />
    </svg>
  );
}

function JarIcon({ size = 22, strokeWidth: _strokeWidth }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M8 10h8v8.2a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10Z" />
      <path d="M9 10V8.2A1.2 1.2 0 0 1 10.2 7h3.6A1.2 1.2 0 0 1 15 8.2V10" />
      <path d="M9 13.5h6" />
    </svg>
  );
}

export function Hero() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const isSale = index === 0;
  const feature = features[Math.max(0, index - 1)];
  const background = heroBackdrops[(Math.max(0, index - 1)) % heroBackdrops.length];

  useEffect(() => {
    setHeroNav(isSale ? "ink" : background.nav);
  }, [background.nav, isSale]);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % slideCount);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [reduced, index]);

  return (
    <div className="flex flex-col md:h-[calc(100svh-var(--announce-h))]">
      <section
        className={`relative overflow-hidden md:h-auto md:min-h-0 md:flex-1 ${isSale ? "bg-[#f6f1ea] text-ink" : `h-[74svh] ${background.nav === "ink" ? "text-ink" : "text-white"}`}`}
        aria-label="Body care, bath, and scent"
        aria-roledescription="carousel"
      >
        {isSale ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[54%] md:block">
            <Media src="/silknknot/hero-diwali.jpg" alt="" sizes="54vw" priority className="object-cover object-[center_60%]" />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <motion.div
              key={background.src}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.01 : 1.2, ease }}
            >
              <Media
                src={background.mobile}
                alt=""
                sizes="100vw"
                priority
                className="object-cover object-[center_38%] md:hidden"
              />
              <Media
                src={background.src}
                alt=""
                sizes="100vw"
                priority
                className="hidden object-cover object-right md:block"
              />
            </motion.div>
          </AnimatePresence>
        )}

        <div className={`relative z-10 mx-auto flex h-full max-w-[1440px] flex-col px-5 pb-8 pt-[calc(var(--nav-h)+1.25rem)] md:px-12 md:pb-10 md:pt-[var(--nav-h)] ${isSale ? "md:justify-center" : "md:justify-center md:pb-0"}`}>
          {isSale ? (
            <div className="w-full max-w-[34rem] text-left text-[#2c2926]">
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#8a7350] md:text-xs">Diwali glow sale</p>
              <h1 className="mt-4 text-[clamp(2.7rem,8vw,4.6rem)] font-medium leading-[1.02] tracking-[-0.035em] text-[#2a241c]">
                Glow a little
                <span className="block">brighter this</span>
                <span className="mt-1 block italic text-[#a68456]">Diwali.</span>
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-[#6f675d] md:text-lg">
                Celebrate the season with your favourite self-care essentials.
              </p>
              <div className="mt-6 flex w-full max-w-md items-stretch overflow-hidden rounded-2xl border border-[#e6dfd4] bg-[#f3eee6]">
                <div className="flex-1 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a7350]">Up to</p>
                  <p className="text-2xl font-medium tracking-tight text-[#2c2926]">25% OFF</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a7350]">Selected products</p>
                </div>
                <div className="flex w-[46%] flex-col justify-center border-l border-[#e6dfd4] px-4 py-3">
                  <p className="text-[11px] text-[#8a7350]">Use code</p>
                  <p className="mt-2 inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-medium tracking-[0.08em] text-[#2c2926]">DIWALI20</p>
                </div>
              </div>
              <Link href="/shop" className="mt-6 inline-flex h-12 items-center gap-3 rounded-full bg-[#9a7352] px-6 text-sm text-white">
                Shop the Sale
                <ArrowRight size={16} />
              </Link>
              <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-2xl md:hidden">
                <Media src="/silknknot/hero-diwali-mobile.jpg" alt="Silken Knot body butter with marigolds and diyas" sizes="100vw" priority className="object-cover" />
              </div>
            </div>
          ) : (
            <div className="w-full text-left text-ink md:max-w-xl">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={feature.label}
                  initial={reduced ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -16 }}
                  transition={{ duration: reduced ? 0 : 0.4, ease }}
                >
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-ink md:text-[12px]">
                    {feature.kicker}
                  </p>
                  <h1 className="mt-3 text-[clamp(3.05rem,13vw,3.9rem)] font-medium leading-[1.02] tracking-[-0.03em] text-ink md:mt-4 md:text-[clamp(2.5rem,5.2vw,4.5rem)]">
                    {feature.title}
                    <span className="mt-1 block italic">{feature.accent}</span>
                  </h1>
                  <p className="mt-4 w-full text-lg leading-relaxed text-ink/70 md:mt-5 md:max-w-md md:text-lg">
                    {feature.note}
                  </p>
                </motion.div>
              </AnimatePresence>
              <div className="mt-6 flex justify-start md:mt-8">
                <Link
                  href={feature.href}
                  className="inline-flex items-center gap-3 rounded-full bg-[#CBAC7C] py-2 pl-5 pr-1.5 text-base text-white md:py-1.5 md:text-sm"
                >
                  Shop {feature.label.toLowerCase()}
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink">
                    <ArrowUpRight size={16} />
                  </span>
                </Link>
              </div>
            </div>
          )}
          <div
            className={`flex items-center gap-2 ${isSale ? "mt-6 justify-start" : "mt-auto justify-center pt-8 md:mt-8 md:justify-start md:pt-0"}`}
            role="tablist"
            aria-label="Hero products"
          >
            {Array.from({ length: slideCount }, (_, itemIndex) => (
              <button
                key={itemIndex}
                type="button"
                role="tab"
                aria-selected={itemIndex === index}
                aria-label={itemIndex === 0 ? "Diwali glow sale" : features[itemIndex - 1].label}
                onClick={() => setIndex(itemIndex)}
                className={`h-1.5 rounded-full transition-all duration-300 ${itemIndex === index ? "w-8" : "w-3"} ${isSale ? (itemIndex === index ? "bg-[#2c2926]" : "bg-[#2c2926]/35") : itemIndex === index ? "bg-current" : "bg-current/40"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {isSale ? (
        <section className="shrink-0 border-t border-[#e7e0d6] bg-[#f7f3ee] text-[#5c5348]" aria-label="Shop the sale">
          <ul className="mx-auto grid max-w-[1100px] grid-cols-5">
            {saleCategories.map((item, itemIndex) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className={itemIndex > 0 ? "border-l border-[#e7e0d6]" : undefined}>
                  <Link href={item.href} className="flex flex-col items-center gap-2 px-2 py-4 text-center md:gap-3 md:py-5">
                    <Icon size={22} strokeWidth={1.4} />
                    <span className="text-[11px] text-[#5c5348] md:text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <section
        className={`shrink-0 overflow-hidden bg-[#efeae3] py-4 text-ink ${isSale ? "hidden" : ""}`}
        aria-label="Care names"
      >
        <div className="silk-marquee flex w-max items-center">
          {[0, 1].map((copy) => (
            <p
              key={copy}
              className="flex items-center text-[clamp(2.6rem,6vw,4.5rem)] font-medium leading-none tracking-[-0.04em] text-ink/70"
              aria-hidden={copy === 1}
            >
              {marquee.map((word) => (
                <span key={word} className="flex items-center">
                  <span className="px-6">{word}</span>
                  <span className="text-[0.55em] text-[#b08968]">✱</span>
                </span>
              ))}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
