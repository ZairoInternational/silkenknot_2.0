"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Media, ease, usePrefersReducedMotion } from "@/components/ui";
import { heroBackdrops, setHeroNav } from "@/lib/hero-nav";

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

export function Hero() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const feature = features[index];
  const background = heroBackdrops[index % heroBackdrops.length];

  useEffect(() => {
    setHeroNav(background.nav);
  }, [background.nav]);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % features.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [reduced, index]);

  return (
    <div className="flex flex-col md:h-[calc(100svh-var(--announce-h))]">
      <section
        className={`relative h-[74svh] overflow-hidden md:h-auto md:min-h-0 md:flex-1 ${background.nav === "ink" ? "text-ink" : "text-white"}`}
        aria-label="Body care, bath, and scent"
        aria-roledescription="carousel"
      >
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

        <div className="relative z-10 mx-auto flex h-full max-w-[1440px] flex-col px-8 pb-8 pt-[calc(var(--nav-h)+1.75rem)] md:justify-center md:px-12 md:pb-0 md:pt-[var(--nav-h)]">
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
          <div
            className="mt-auto flex items-center justify-center gap-2 pt-8 md:mt-8 md:justify-start md:pt-0"
            role="tablist"
            aria-label="Hero products"
          >
            {features.map((item, itemIndex) => (
              <button
                key={item.label}
                type="button"
                role="tab"
                aria-selected={itemIndex === index}
                aria-label={item.label}
                onClick={() => setIndex(itemIndex)}
                className={`h-1.5 rounded-full transition-all duration-300 ${itemIndex === index ? "w-8 bg-current" : "w-3 bg-current/40"}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        className="shrink-0 overflow-hidden bg-[#efeae3] py-4 text-ink"
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
