"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Media, ease, usePrefersReducedMotion } from "@/components/ui";

const backgrounds = ["/silknknot/candle1.jpg", "/silknknot/soap1.webp", "/silknknot/whipped_shop.jpg"];

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
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const backdropScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -36]);
  const cardY = useTransform(scrollYProgress, [0, 1], [16, -28]);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [featureIndex, setFeatureIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setBackgroundIndex((value) => value + 1), 5200);
    return () => window.clearInterval(timer);
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    return scrollYProgress.on("change", (value) => {
      const next = value < 0.2 ? 0 : value < 0.4 ? 1 : 2;
      setFeatureIndex((current) => (current === next ? current : next));
    });
  }, [reduced, scrollYProgress]);

  const background = backgrounds[backgroundIndex % backgrounds.length];
  const feature = features[featureIndex];

  return (
    <section
      ref={ref}
      className={reduced ? "relative bg-[#1c1916]" : "relative h-[280vh] bg-[#1c1916]"}
      aria-label="Body care, bath, and scent"
    >
      <div
        className={`${reduced ? "relative" : "sticky top-0"} overflow-hidden text-white`}
        style={{ height: "calc(100svh - var(--announce-h))" }}
      >
        <motion.div className="absolute inset-0" style={reduced ? undefined : { scale: backdropScale }}>
          <AnimatePresence initial={false}>
            <motion.div
              key={background}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.01 : 1.2, ease }}
            >
              <Media src={background} alt="" sizes="100vw" priority className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/15" />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="relative z-10 mx-auto flex h-full max-w-[1440px] items-center px-5 pb-28 pt-28 md:px-12">
          <div className="grid w-full items-center gap-10 md:grid-cols-[1fr_minmax(280px,440px)] md:gap-12">
            <motion.div className="max-w-xl" style={reduced ? undefined : { y: copyY }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={feature.label}
                  initial={reduced ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -16 }}
                  transition={{ duration: reduced ? 0 : 0.4, ease }}
                >
                  <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-white/75">
                    {feature.kicker}
                  </p>
                  <h1 className="mt-4 text-[clamp(2.5rem,5.2vw,4.5rem)] font-medium leading-[1.02] tracking-[-0.03em]">
                    {feature.title}
                    <span className="mt-1 block font-serif font-normal italic">{feature.accent}</span>
                  </h1>
                  <p className="mt-5 max-w-md text-base leading-relaxed text-white/80 md:text-lg">
                    {feature.note}
                  </p>
                </motion.div>
              </AnimatePresence>
              <Link
                href={feature.href}
                className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/80 py-1.5 pl-5 pr-1.5 text-sm"
              >
                Shop {feature.label.toLowerCase()}
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink">
                  <ArrowUpRight size={16} />
                </span>
              </Link>
            </motion.div>

            <motion.div className="hidden md:block" style={reduced ? undefined : { y: cardY }}>
              <div className="relative aspect-[5/4] overflow-hidden rounded-[1.4rem] bg-[#f6f3ee] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)]">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={feature.src}
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduced ? 0.01 : 0.45, ease }}
                  >
                    <Media src={feature.src} alt={feature.label} sizes="40vw" className="object-contain" />
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 overflow-hidden pb-2">
          <div className="silk-marquee flex w-max items-center">
            {[0, 1].map((copy) => (
              <p
                key={copy}
                className="flex items-center text-[clamp(3.4rem,9vw,7rem)] font-medium leading-none tracking-[-0.04em] text-white/70"
                aria-hidden={copy === 1}
              >
                {marquee.map((word) => (
                  <span key={word} className="flex items-center">
                    <span className="px-6">{word}</span>
                    <span className="text-[0.55em] text-[#f0c9a0]">✱</span>
                  </span>
                ))}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
