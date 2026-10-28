"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Pause,
  Play,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Media, ease, usePrefersReducedMotion } from "@/components/ui";
import { setHeroNav } from "@/lib/hero-nav";
import type { HeroContent, HeroEvergreenSlide, HeroOffer } from "@/lib/hero/content";
import { DEFAULT_HERO_CONTENT, DEFAULT_HERO_OFFER } from "@/lib/hero/content";

/* Palette (existing): ivory #f6f1ea / #f7f3ee, sand #CBAC7C, bronze #9a7352,
   gold text #8a7350 / #a68456, ink #2c2926. New, matched to the set: marigold
   #e8b96a (glow only) and a deeper bronze #85603f for hover. */

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7352]";
const AUTOPLAY_SECONDS = 5.2;

type Slide = {
  id: string;
  label: string;
  pill: string;
  title: string[]; // last line is set in italic gold
  note: string;
  cta: string;
  href: string;
  secondaryCta: string;
  secondaryHref: string;
  image: string;
  alt: string;
  cardTag: string;
  cardName: string;
  chips: string[];
  couponCode?: string;
  sealLabel?: string;
  sealPercent?: string;
  isOffer?: boolean;
};

function evergreenToSlide(slide: HeroEvergreenSlide): Slide {
  return {
    id: slide.id,
    label: slide.label,
    pill: slide.pill,
    title: [slide.titleLine1, slide.titleLine2],
    note: slide.note,
    cta: slide.cta,
    href: slide.href,
    secondaryCta: slide.secondaryCta,
    secondaryHref: slide.secondaryHref,
    image: slide.image,
    alt: slide.alt,
    cardTag: slide.cardTag,
    cardName: slide.cardName,
    chips: slide.chips,
  };
}

function offerToSlide(offer: HeroOffer): Slide {
  return {
    id: "sale",
    label: offer.pill,
    pill: offer.pill,
    title: [offer.titleLine1, offer.titleLine2],
    note: offer.note,
    cta: offer.cta,
    href: offer.href,
    secondaryCta: offer.secondaryCta,
    secondaryHref: offer.secondaryHref,
    image: offer.image,
    alt: offer.alt,
    cardTag: offer.cardTag,
    cardName: offer.cardName,
    chips: offer.chips,
    couponCode: offer.couponCode,
    sealLabel: offer.sealLabel,
    sealPercent: offer.sealPercent,
    isOffer: true,
  };
}

function buildSlides(offer: HeroOffer, evergreen: HeroEvergreenSlide[]): Slide[] {
  const productSlides = evergreen.map(evergreenToSlide);
  return offer.enabled ? [offerToSlide(offer), ...productSlides] : productSlides;
}

const marquee = ["Body butter", "Bath soap", "Sugar scrub", "Candles"];

function SaleSeal({
  reduced,
  label,
  percent,
}: {
  reduced: boolean;
  label: string;
  percent: string;
}) {
  const id = useId().replace(/:/g, "");
  const ring = `${label} • ${label} • `;
  return (
    <motion.div
      className="absolute -right-2 top-10 z-20 md:-right-10 md:top-16"
      initial={reduced ? false : { opacity: 0, scale: 0.6, rotate: -20 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{
        duration: reduced ? 0 : 0.7,
        ease,
        delay: reduced ? 0 : 0.35,
      }}
    >
      <div className="relative grid h-[5.75rem] w-[5.75rem] place-items-center rounded-full bg-[#2c2926] text-[#f6f1ea] shadow-[0_18px_36px_-16px_rgba(44,41,38,0.6)] md:h-32 md:w-32">
        <motion.svg
          viewBox="0 0 120 120"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 24, ease: "linear", repeat: Infinity }}
        >
          <defs>
            <path
              id={id}
              d="M60 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0"
            />
          </defs>
          <text
            fontSize="9"
            fill="#e8b96a"
            textLength="284"
            lengthAdjust="spacing"
          >
            <textPath href={`#${id}`}>{ring}</textPath>
          </text>
        </motion.svg>
        <span className="text-center leading-none">
          <span className="block text-[10px] opacity-70">up to</span>
          <span className="block font-serif text-[1.55rem] md:text-3xl">
            {percent.replace(/\s*off$/i, "").trim() || percent}
          </span>
          <span className="block text-[10px] opacity-70">off</span>
        </span>
      </div>
    </motion.div>
  );
}

function Coupon({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard can be blocked, the code is still visible */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={`mt-5 inline-flex items-center gap-3 rounded-full border border-dashed border-[#CBAC7C] bg-white/70 px-4 py-2 text-left transition-colors hover:bg-white ${FOCUS}`}
      aria-label={`Copy code ${code}`}
    >
      <span className="text-[11px] text-[#8a7350]">Code</span>
      <span className="text-sm font-medium tracking-[0.12em] text-[#2c2926]">{code}</span>
      <span className="inline-flex items-center gap-1 text-xs text-[#9a7352]" aria-live="polite">
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

const wrap = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
};
const rise = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

export function Hero({
  offer = DEFAULT_HERO_OFFER,
  evergreen = DEFAULT_HERO_CONTENT.evergreen,
  content,
}: {
  offer?: HeroOffer;
  evergreen?: HeroEvergreenSlide[];
  content?: HeroContent;
}) {
  const resolvedOffer = content?.offer ?? offer;
  const resolvedEvergreen = content?.evergreen ?? evergreen;
  const reduced = usePrefersReducedMotion();
  const slides = buildSlides(resolvedOffer, resolvedEvergreen);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const safeIndex = Math.min(index, slides.length - 1);
  const slide = slides[safeIndex] ?? slides[0];
  const isSale = Boolean(slide?.isOffer);
  const auto = playing && !reduced;
  const go = (next: number) => setIndex((next + slides.length) % slides.length);

  useEffect(() => {
    setIndex(0);
  }, [resolvedOffer.enabled, resolvedOffer.pill, resolvedOffer.titleLine1, resolvedEvergreen]);

  // The hero is always ivory now, so the transparent navbar always uses dark ink.
  useEffect(() => {
    setHeroNav("ink");
  }, []);

  return (
    <div className="flex flex-col md:h-[calc(100svh-var(--announce-h))] md:min-h-[640px]">
      <section
        className="relative overflow-hidden bg-[#f6f1ea] text-ink md:min-h-0 md:flex-1"
        aria-label="Body care, bath, and scent"
        aria-roledescription="carousel"
      >
        {/* soft palette glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 60% at 88% 42%, rgba(203,172,124,0.34), transparent 70%), radial-gradient(40% 45% at 0% 100%, rgba(232,185,106,0.2), transparent 70%)",
          }}
        />

        <div className="relative z-10 mx-auto grid h-full max-w-[1440px] grid-cols-1 gap-8 px-5 pb-10 pt-[calc(var(--nav-h)+1.25rem)] md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:px-12 md:pb-8 md:pt-[var(--nav-h)]">
          {/* Copy — below the image on mobile, left column on desktop */}
          <div className="order-2 flex flex-col justify-center md:order-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={slide.id}
                variants={wrap}
                initial={reduced ? false : "hidden"}
                animate="show"
                exit={reduced ? undefined : "exit"}
                aria-live="off"
              >
                <motion.p
                  variants={rise}
                  className="inline-flex items-center gap-2 rounded-full border border-[#e6dfd4] bg-white/60 px-3.5 py-1.5 text-[12px] font-medium text-[#8a7350]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#e8b96a]" />
                  {slide.pill}
                </motion.p>

                <h1 className="mt-5 max-w-[34rem] font-serif text-[clamp(2.7rem,11vw,3.6rem)] font-medium leading-[1.03] tracking-[-0.03em] text-[#2a241c] md:text-[clamp(2.6rem,4.6vw,4.4rem)]">
                  {slide.title.map((line, lineIndex) => (
                    <motion.span
                      key={line}
                      variants={rise}
                      className={`block ${lineIndex === slide.title.length - 1 ? "italic text-[#a68456]" : ""}`}
                    >
                      {line}
                    </motion.span>
                  ))}
                </h1>

                <motion.p
                  variants={rise}
                  className="mt-5 max-w-md text-base leading-relaxed text-[#5c5348] md:text-lg"
                >
                  {slide.note}
                </motion.p>

                {isSale && slide.couponCode ? (
                  <motion.div variants={rise}>
                    <Coupon code={slide.couponCode} />
                  </motion.div>
                ) : null}

                <motion.div
                  variants={rise}
                  className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3"
                >
                  <Link
                    href={slide.href}
                    className={`group inline-flex items-center gap-3 rounded-full bg-[#9a7352] py-1.5 pl-6 pr-1.5 text-sm text-white transition-colors hover:bg-[#85603f] ${FOCUS}`}
                  >
                    {slide.cta}
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink transition-transform duration-300 group-hover:rotate-45">
                      <ArrowUpRight size={16} />
                    </span>
                  </Link>
                  <Link
                    href={slide.secondaryHref}
                    className={`inline-flex items-center gap-2 text-sm text-[#2c2926] underline decoration-[#CBAC7C] decoration-2 underline-offset-[6px] ${FOCUS}`}
                  >
                    {slide.secondaryCta}
                    <ArrowRight size={14} />
                  </Link>
                </motion.div>
              </motion.div>
            </AnimatePresence>

            <ul className="mt-7 hidden flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#5c5348] md:flex">
              <li className="inline-flex items-center gap-2">
                <Truck size={16} strokeWidth={1.5} className="text-[#9a7352]" />{" "}
                Free shipping over ₹999
              </li>
              <li className="inline-flex items-center gap-2">
                <ShieldCheck
                  size={16}
                  strokeWidth={1.5}
                  className="text-[#9a7352]"
                />{" "}
                Cancel before dispatch
              </li>
            </ul>

            {/* Controls with autoplay progress */}
            <div
              className="mt-7 flex items-center gap-3 md:mt-8"
              role="tablist"
              aria-label="Hero products"
            >
              {slides.map((item, itemIndex) => {
                const active = itemIndex === safeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={item.label}
                    onClick={() => setIndex(itemIndex)}
                    className={`group flex h-6 items-center ${FOCUS}`}
                  >
                    <span
                      className={`relative block h-[3px] overflow-hidden rounded-full bg-[#2c2926]/20 transition-all duration-300 ${active ? "w-14" : "w-6 group-hover:bg-[#2c2926]/40"}`}
                    >
                      {active ? (
                        <motion.span
                          key={`${safeIndex}-${auto}`}
                          className="absolute inset-0 origin-left rounded-full bg-[#2c2926]"
                          initial={{ scaleX: auto ? 0 : 1 }}
                          animate={{ scaleX: 1 }}
                          transition={{
                            duration: auto ? AUTOPLAY_SECONDS : 0,
                            ease: "linear",
                          }}
                          onAnimationComplete={() => {
                            if (auto) go(safeIndex + 1);
                          }}
                        />
                      ) : null}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                aria-label={playing ? "Pause slideshow" : "Play slideshow"}
                className={`ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e0d7ca] text-[#5c5348] transition-colors hover:bg-white ${FOCUS}`}
              >
                {playing ? <Pause size={13} /> : <Play size={13} />}
              </button>
            </div>
          </div>

          {/* Visual: arch stage — first on mobile, right column on desktop */}
          <div className="relative order-1 h-[50svh] min-h-[340px] w-full md:order-2 md:my-auto md:h-full md:max-h-[620px] md:max-w-[460px] md:justify-self-end">
            <motion.div
              className="absolute inset-0 overflow-hidden rounded-b-[28px] rounded-t-[999px] border border-[#CBAC7C]/70 bg-[#e7dfd4]"
              style={{ touchAction: "pan-y" }}
              initial={
                reduced
                  ? false
                  : {
                      clipPath:
                        "inset(12% 8% 0% 8% round 999px 999px 28px 28px)",
                      opacity: 0,
                    }
              }
              animate={{
                clipPath: "inset(0% 0% 0% 0% round 999px 999px 28px 28px)",
                opacity: 1,
              }}
              transition={{ duration: reduced ? 0 : 1, ease }}
              onPanEnd={(_, info) => {
                if (
                  Math.abs(info.offset.x) > 50 &&
                  Math.abs(info.offset.x) > Math.abs(info.offset.y)
                ) {
                  go(safeIndex + (info.offset.x < 0 ? 1 : -1));
                }
              }}
            >
              <AnimatePresence initial={false}>
                <motion.div
                  key={slide.id}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: reduced ? 1 : 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0.01 : 1.2, ease }}
                >
                  <Media
                    src={slide.image}
                    alt={slide.alt}
                    sizes="(min-width: 768px) 460px, 90vw"
                    priority
                    className="object-cover object-center"
                  />
                </motion.div>
              </AnimatePresence>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#2c2926]/35 to-transparent"
              />
            </motion.div>

            <AnimatePresence>
              {isSale && slide.sealLabel && slide.sealPercent ? (
                <SaleSeal
                  key="seal"
                  reduced={reduced}
                  label={slide.sealLabel}
                  percent={slide.sealPercent}
                />
              ) : null}
            </AnimatePresence>

            {/* Floating product card */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={slide.id}
                className="absolute bottom-5 left-3 z-20 w-[min(15.5rem,calc(100%-1.5rem))] md:-left-12 md:bottom-10"
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: 10 }}
                transition={{
                  duration: reduced ? 0 : 0.45,
                  ease,
                  delay: reduced ? 0 : 0.2,
                }}
              >
                <Link
                  href={slide.href}
                  className={`block rounded-2xl bg-[#f7f3ee]/90 p-3.5 shadow-[0_18px_40px_-18px_rgba(44,41,38,0.5)] backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5 ${FOCUS}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-[11px] text-[#8a7350]">
                        {slide.cardTag}
                      </span>
                      <span className="mt-0.5 block font-serif text-lg leading-tight text-[#2c2926]">
                        {slide.cardName}
                      </span>
                    </span>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#CBAC7C] text-white">
                      <ArrowUpRight size={15} />
                    </span>
                  </span>
                  <span className="mt-2.5 flex flex-wrap gap-1.5">
                    {slide.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-[#e6dfd4] bg-white px-2.5 py-0.5 text-[11px] text-[#5c5348]"
                      >
                        {chip}
                      </span>
                    ))}
                  </span>
                </Link>
              </motion.div>
            </AnimatePresence>
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
