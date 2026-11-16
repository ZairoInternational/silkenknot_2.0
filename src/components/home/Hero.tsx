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
import type { PublicBanner } from "@/lib/banners/content";
import { setHeroNav } from "@/lib/hero-nav";
import type { HeroContent, HeroEvergreenSlide, HeroOffer } from "@/lib/hero/content";
import { DEFAULT_HERO_CONTENT, DEFAULT_HERO_OFFER } from "@/lib/hero/content";
import { formatPrice } from "@/lib/format";
import { useShippingDisplay } from "@/lib/shipping/client";

/* Silken Knot palette: Ivory #F8F6F1, Charcoal #292B2B, Midnight #1F3B40, Champagne #C7AD87.
   Hero teal accent: #5FA4AD */

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5FA4AD]";
const AUTOPLAY_SECONDS = 5.2;

type ClassicSlide = {
  id: string;
  label: string;
  pill: string;
  title: string[];
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

type CarouselItem =
  | { kind: "campaign"; id: string; banner: PublicBanner; label: string }
  | { kind: "classic"; id: string; slide: ClassicSlide; label: string };

function evergreenToSlide(slide: HeroEvergreenSlide): ClassicSlide {
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

function offerToSlide(offer: HeroOffer): ClassicSlide {
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

function buildCarouselItems(
  offer: HeroOffer,
  evergreen: HeroEvergreenSlide[],
  campaignBanners: PublicBanner[],
): CarouselItem[] {
  const classic: CarouselItem[] = [];
  if (offer.enabled) {
    const slide = offerToSlide(offer);
    classic.push({ kind: "classic", id: slide.id, slide, label: slide.label });
  }
  for (const slide of evergreen.map(evergreenToSlide)) {
    classic.push({ kind: "classic", id: slide.id, slide, label: slide.label });
  }

  if (!campaignBanners.length) return classic;

  const campaigns: CarouselItem[] = campaignBanners
    .filter((banner) => banner.image.desktopUrl)
    .map((banner, index) => ({
      kind: "campaign" as const,
      id: `campaign-${banner.id || index}`,
      banner,
      label: banner.title || banner.promotionalText || "Campaign",
    }));

  // Full-bleed campaigns lead, then the existing product/sale carousel continues.
  return [...campaigns, ...classic];
}

const marquee = ["Body butter", "Bath soap", "Sugar scrub", "Candles"];

function FullBleedMedia({
  desktop,
  mobile,
  alt,
  priority,
}: {
  desktop: string;
  mobile?: string;
  alt: string;
  priority: boolean;
}) {
  if (mobile && mobile !== desktop) {
    return (
      <>
        <div className="absolute inset-0 md:hidden">
          <Media src={mobile} alt={alt} sizes="100vw" priority={priority} className="object-cover object-center" />
        </div>
        <div className="absolute inset-0 hidden md:block">
          <Media src={desktop} alt={alt} sizes="100vw" priority={priority} className="object-cover object-center" />
        </div>
      </>
    );
  }
  return (
    <Media src={desktop} alt={alt} sizes="100vw" priority={priority} className="object-cover object-center" />
  );
}

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
      <div className="relative grid h-[5.75rem] w-[5.75rem] place-items-center rounded-full bg-[#1F3B40] text-[#F8F6F1] shadow-[0_18px_36px_-16px_rgba(31,59,64,0.65)] md:h-32 md:w-32">
        <motion.svg
          viewBox="0 0 120 120"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 24, ease: "linear", repeat: Infinity }}
        >
          <defs>
            <path id={id} d="M60 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0" />
          </defs>
          <text fontSize="9" fill="#C7AD87" textLength="284" lengthAdjust="spacing">
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
      className={`mt-5 inline-flex items-center gap-3 rounded-full border border-dashed border-[#5FA4AD] bg-paper/70 px-4 py-2 text-left transition-colors hover:bg-paper ${FOCUS}`}
      aria-label={`Copy code ${code}`}
    >
      <span className="text-[11px] font-semibold text-mist-ink">Code</span>
      <span className="text-sm font-semibold tracking-[0.12em] text-ink">{code}</span>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-mist-ink" aria-live="polite">
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

function CarouselControls({
  items,
  safeIndex,
  auto,
  playing,
  onSelect,
  onTogglePlay,
  className = "",
}: {
  items: CarouselItem[];
  safeIndex: number;
  auto: boolean;
  playing: boolean;
  onSelect: (index: number) => void;
  onTogglePlay: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`} role="tablist" aria-label="Hero slides">
      {items.map((item, itemIndex) => {
        const active = itemIndex === safeIndex;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={item.label}
            onClick={() => onSelect(itemIndex)}
            className={`group flex h-6 items-center ${FOCUS}`}
          >
            <span
              className={`relative block h-[3px] overflow-hidden rounded-full bg-[#292B2B]/20 transition-all duration-300 ${
                active ? "w-14" : "w-6 group-hover:bg-[#292B2B]/40"
              }`}
            >
              {active ? (
                <motion.span
                  key={`${safeIndex}-${auto}`}
                  className="absolute inset-0 origin-left rounded-full bg-[#5FA4AD]"
                  initial={{ scaleX: auto ? 0 : 1 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: auto ? AUTOPLAY_SECONDS : 0,
                    ease: "linear",
                  }}
                  onAnimationComplete={() => {
                    if (auto) onSelect((safeIndex + 1) % items.length);
                  }}
                />
              ) : null}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={playing ? "Pause slideshow" : "Play slideshow"}
        className={`ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone bg-paper/90 text-[#5FA4AD] transition-colors hover:bg-paper ${FOCUS}`}
      >
        {playing ? <Pause size={13} /> : <Play size={13} />}
      </button>
    </div>
  );
}

function CampaignFullBleed({
  banner,
  reduced,
  preview,
}: {
  banner: PublicBanner;
  reduced: boolean;
  preview: boolean;
}) {
  // Homepage campaigns are image-only creatives. Optional link makes the whole image clickable.
  const href = banner.cta.enabled && banner.cta.href ? banner.cta.href : "";
  const label = banner.image.alt || "Campaign banner";
  const linkProps = banner.cta.openInNewTab ? ({ target: "_blank", rel: "noopener noreferrer" } as const) : {};
  const fadeMs = reduced ? 0.01 : 0.7;

  return (
    <div className="absolute inset-0" style={{ touchAction: "pan-y" }}>
      {/* White band under the transparent nav so campaign logos/links stay ink-on-white. */}
      <div aria-hidden className="absolute inset-x-0 top-0 z-0 h-[var(--nav-h)] bg-white" />

      {/* Creative lives fully below the nav — no overlay copy, blur, or CTA chrome. */}
      <div className="absolute inset-x-0 bottom-0 top-[var(--nav-h)] overflow-hidden bg-paper">
        <AnimatePresence initial={false}>
          <motion.div
            key={banner.id}
            className="absolute inset-0"
            // Fade the new image in on top; keep the outgoing image fully opaque underneath
            // so the loop never flashes an empty (black) frame between slides.
            initial={{ opacity: 0, zIndex: 2 }}
            animate={{ opacity: 1, zIndex: 2, transition: { duration: fadeMs, ease } }}
            exit={{ opacity: 1, zIndex: 1, transition: { duration: fadeMs } }}
          >
            <FullBleedMedia
              desktop={banner.image.desktopUrl}
              mobile={banner.image.mobileUrl || undefined}
              alt={href ? "" : banner.image.alt}
              priority={!preview}
            />
          </motion.div>
        </AnimatePresence>

        {href ? (
          <Link href={href} aria-label={label} {...linkProps} className={`absolute inset-0 z-10 ${FOCUS}`} />
        ) : null}
      </div>
    </div>
  );
}

export function Hero({
  offer = DEFAULT_HERO_OFFER,
  evergreen = DEFAULT_HERO_CONTENT.evergreen,
  content,
  preview = false,
  campaignBanners = [],
}: {
  offer?: HeroOffer;
  evergreen?: HeroEvergreenSlide[];
  content?: HeroContent;
  /** Admin draft preview: fill a frame, skip storefront nav side effects. */
  preview?: boolean;
  /** Eligible homepage-hero campaigns — full-bleed slides ahead of the classic carousel. */
  campaignBanners?: PublicBanner[];
}) {
  const resolvedOffer = content?.offer ?? offer;
  const resolvedEvergreen = content?.evergreen ?? evergreen;
  const reduced = usePrefersReducedMotion();
  const shipping = useShippingDisplay();
  const items = buildCarouselItems(resolvedOffer, resolvedEvergreen, campaignBanners);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const slideResetKey = `${campaignBanners.map((item) => item.id).join("|")}|${resolvedOffer.enabled}|${resolvedOffer.pill}|${resolvedEvergreen.map((item) => item.id).join(",")}`;
  const [activeResetKey, setActiveResetKey] = useState(slideResetKey);
  if (activeResetKey !== slideResetKey) {
    setActiveResetKey(slideResetKey);
    setIndex(0);
  }
  const safeIndex = Math.min(index, Math.max(items.length - 1, 0));
  const current = items[safeIndex] ?? items[0];
  const isCampaign = current?.kind === "campaign";
  const classic = current?.kind === "classic" ? current.slide : null;
  const isSale = Boolean(classic?.isOffer);
  const auto = playing && !reduced && items.length > 1;
  const go = (next: number) => setIndex((next + items.length) % items.length);

  useEffect(() => {
    if (preview) return;
    // Campaign and classic hero both sit on light paper; keep nav links charcoal.
    setHeroNav("ink");
  }, [preview, isCampaign]);

  const controls = (
    <CarouselControls
      items={items}
      safeIndex={safeIndex}
      auto={auto}
      playing={playing}
      onSelect={setIndex}
      onTogglePlay={() => setPlaying((value) => !value)}
    />
  );

  return (
    <div
      className={
        preview
          ? "flex h-full min-h-0 flex-col"
          : "flex flex-col md:h-[calc(100svh-var(--announce-h))] md:min-h-[640px]"
      }
    >
      <section
        className="relative min-h-[72svh] overflow-hidden bg-paper text-ink md:min-h-0 md:flex-1"
        aria-label={preview ? "Homepage hero preview" : "Body care, bath, and scent"}
        aria-roledescription="carousel"
      >
        {/*
          Crossfade modes (no mode="wait"): wait left a blank frame while the section
          was still on the campaign black bg — that flash showed between the last slide
          and the first campaign. Stable keys keep campaign↔campaign on one shell.
        */}
        <AnimatePresence initial={false}>
          {isCampaign && current.kind === "campaign" ? (
            <motion.div
              key="mode-campaign"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.45 }}
              onPanEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 50 && Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
                  go(safeIndex + (info.offset.x < 0 ? 1 : -1));
                }
              }}
            >
              <CampaignFullBleed banner={current.banner} reduced={reduced} preview={preview} />
            </motion.div>
          ) : classic ? (
            <motion.div
              key="mode-classic"
              className="absolute inset-0 bg-paper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.45 }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(55% 60% at 88% 42%, rgba(95,164,173,0.18), transparent 70%), radial-gradient(40% 45% at 0% 100%, rgba(199,173,135,0.16), transparent 70%)",
                }}
              />

              <div className="relative z-10 mx-auto grid h-full max-w-[1440px] grid-cols-1 gap-8 px-5 pb-8 pt-[calc(var(--nav-h)+1.25rem)] md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:px-12 md:pb-20 md:pt-[var(--nav-h)]">
                <div className="order-2 flex flex-col justify-center md:order-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={classic.id}
                      variants={wrap}
                      initial={reduced ? false : "hidden"}
                      animate="show"
                      exit={reduced ? undefined : "exit"}
                      aria-live="off"
                    >
                      <motion.p
                        variants={rise}
                        className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-1.5 text-[12px] font-semibold text-mist-ink"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-mist" />
                        {classic.pill}
                      </motion.p>

                      <h1 className="mt-5 max-w-[34rem] font-serif text-[clamp(2.7rem,11vw,3.6rem)] font-medium leading-[1.03] tracking-[-0.03em] text-ink md:text-[clamp(2.6rem,4.6vw,4.4rem)]">
                        {classic.title.map((line, lineIndex) => (
                          <motion.span
                            key={line}
                            variants={rise}
                            className={`block ${lineIndex === classic.title.length - 1 ? "italic text-mist-ink" : ""}`}
                          >
                            {line}
                          </motion.span>
                        ))}
                      </h1>

                      <motion.p variants={rise} className="mt-5 max-w-md text-base leading-relaxed text-ink/80 md:text-lg">
                        {classic.note}
                      </motion.p>

                      {isSale && classic.couponCode ? (
                        <motion.div variants={rise}>
                          <Coupon code={classic.couponCode} />
                        </motion.div>
                      ) : null}

                      <motion.div variants={rise} className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <Link
                          href={classic.href}
                          className={`group inline-flex items-center gap-3 rounded-full bg-ink py-1.5 pl-6 pr-1.5 text-sm text-paper transition-colors hover:bg-midnight ${FOCUS}`}
                        >
                          {classic.cta}
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink transition-transform duration-300 group-hover:rotate-45">
                            <ArrowUpRight size={16} />
                          </span>
                        </Link>
                        {classic.secondaryHref ? (
                          <Link
                            href={classic.secondaryHref}
                            className={`inline-flex items-center gap-2 text-sm text-ink underline decoration-[#5FA4AD] decoration-2 underline-offset-[6px] ${FOCUS}`}
                          >
                            {classic.secondaryCta}
                            <ArrowRight size={14} />
                          </Link>
                        ) : null}
                      </motion.div>
                    </motion.div>
                  </AnimatePresence>

                  <ul className="mt-7 hidden flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium text-ink/80 md:flex">
                    <li className="inline-flex items-center gap-2">
                      <Truck size={16} strokeWidth={1.5} className="text-mist-ink" /> Free shipping over {formatPrice(shipping.freeShippingAt)}
                    </li>
                    <li className="inline-flex items-center gap-2">
                      <ShieldCheck size={16} strokeWidth={1.5} className="text-mist-ink" /> Cancel before dispatch
                    </li>
                  </ul>
                </div>

                <div className="relative order-1 h-[50svh] min-h-[340px] w-full md:order-2 md:my-auto md:h-full md:max-h-[620px] md:max-w-[460px] md:justify-self-end">
                  <motion.div
                    className="absolute inset-0 overflow-hidden rounded-b-[28px] rounded-t-[999px] border border-[#5FA4AD]/40 bg-sand"
                    style={{ touchAction: "pan-y" }}
                    initial={
                      reduced
                        ? false
                        : {
                            clipPath: "inset(12% 8% 0% 8% round 999px 999px 28px 28px)",
                            opacity: 0,
                          }
                    }
                    animate={{
                      clipPath: "inset(0% 0% 0% 0% round 999px 999px 28px 28px)",
                      opacity: 1,
                    }}
                    transition={{ duration: reduced ? 0 : 1, ease }}
                    onPanEnd={(_, info) => {
                      if (Math.abs(info.offset.x) > 50 && Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
                        go(safeIndex + (info.offset.x < 0 ? 1 : -1));
                      }
                    }}
                  >
                    <AnimatePresence initial={false}>
                      <motion.div
                        key={classic.id}
                        className="absolute inset-0"
                        initial={{ opacity: 0, scale: reduced ? 1 : 1.08 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduced ? 0.01 : 1.2, ease }}
                      >
                        <Media
                          src={classic.image}
                          alt={classic.alt}
                          sizes="(min-width: 768px) 460px, 90vw"
                          priority={!preview}
                          className="object-cover object-center"
                        />
                      </motion.div>
                    </AnimatePresence>
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-midnight/35 to-transparent"
                    />
                  </motion.div>

                  <AnimatePresence>
                    {isSale && classic.sealLabel && classic.sealPercent ? (
                      <SaleSeal key="seal" reduced={reduced} label={classic.sealLabel} percent={classic.sealPercent} />
                    ) : null}
                  </AnimatePresence>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={classic.id}
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
                        href={classic.href}
                        className={`block rounded-2xl bg-paper/90 p-3.5 shadow-[0_18px_40px_-18px_rgba(31,59,64,0.4)] backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5 ${FOCUS}`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span>
                            <span className="block text-[11px] font-semibold text-mist-ink">{classic.cardTag}</span>
                            <span className="mt-0.5 block font-serif text-lg leading-tight text-ink">{classic.cardName}</span>
                          </span>
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
                            <ArrowUpRight size={15} />
                          </span>
                        </span>
                        <span className="mt-2.5 flex flex-wrap gap-1.5">
                          {classic.chips.map((chip) => (
                            <span
                              key={chip}
                              className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-[11px] font-medium text-ink/80"
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
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Desktop: controls float over the hero. Mobile: kept out of this layer so they
            do not sit on the product card or the care-names strip below. */}
        {items.length > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-7 z-40 hidden justify-center md:flex">
            <div className="pointer-events-auto">{controls}</div>
          </div>
        ) : null}
      </section>

      {items.length > 0 ? (
        <div className="flex shrink-0 items-center justify-center gap-3 bg-paper px-5 py-3 md:hidden">
          {controls}
        </div>
      ) : null}

      <section className="shrink-0 overflow-hidden bg-[#100E09] py-4" aria-label="Care names">
        <div className="silk-marquee flex w-max items-center">
          {[0, 1].map((copy) => (
            <p
              key={copy}
              className="flex items-center font-serif text-[clamp(2.4rem,5.5vw,4.1rem)] font-medium leading-none tracking-[-0.03em] text-[#d4b896]"
              aria-hidden={copy === 1}
            >
              {marquee.map((word) => (
                <span key={word} className="flex items-center">
                  <span className="px-6">{word}</span>
                  <span className="text-[0.55em] text-[#5FA4AD]">✱</span>
                </span>
              ))}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
