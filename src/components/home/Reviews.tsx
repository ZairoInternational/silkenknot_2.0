"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Heart,
  Leaf,
  ShieldCheck,
  Star,
  Truck,
  User,
} from "lucide-react";

type Testimonial = {
  id: number;
  name: string;
  city: string;
  rating: number;
  text: string;
  product: string;
  productSlug: string;
  productImage: string;
};

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Ananya R.",
    city: "Bengaluru",
    rating: 5,
    text: "The candle is absolutely beautiful. It fills my room with a calming fragrance and the packaging feels so premium.",
    product: "Studio Tin Candle",
    productSlug: "studio-tin-candle",
    productImage: "/silknknot/candle2.webp",
  },
  {
    id: 2,
    name: "Priya S.",
    city: "Hyderabad",
    rating: 5,
    text: "My skin has never felt so soft and nourished. The fragrance is subtle yet so luxurious. Truly a self-care essential!",
    product: "Night Milk Body Butter",
    productSlug: "night-milk-body-butter",
    productImage: "/silknknot/new_updates/body_butter.png",
  },
  {
    id: 3,
    name: "Meera K.",
    city: "Mumbai",
    rating: 5,
    text: "These bath salts are pure bliss! It turns my bath time into a spa experience. Love the natural ingredients.",
    product: "Mineral Bath Salts",
    productSlug: "mineral-bath-salts",
    productImage: "/silknknot/new_updates/bath-salts.jfif",
  },
  {
    id: 4,
    name: "Ishita M.",
    city: "Pune",
    rating: 5,
    text: "Everything feels thoughtfully made. The texture, the presentation and the little details make my daily routine special.",
    product: "Atelier Milk Soap",
    productSlug: "atelier-milk-soap",
    productImage: "/silknknot/soap1.webp",
  },
  {
    id: 5,
    name: "Rhea P.",
    city: "Chennai",
    rating: 5,
    text: "A beautiful addition to my evening routine. The product feels indulgent without being over the top.",
    product: "Palm Sugar Scrub",
    productSlug: "palm-sugar-scrub",
    productImage: "/silknknot/sugar_scrap1.jpg",
  },
];

// Overall store rating shown in the header. Edit these two to match your real numbers.
const OVERALL_RATING = "4.9";
const OVERALL_COUNT = "2,800+";

const AUTOPLAY_MS = 5000;

const trustItems = [
  {
    title: "Natural Ingredients",
    subtitle: "Thoughtfully sourced",
    Icon: Leaf,
  },
  {
    title: "Handcrafted with Care",
    subtitle: "Small batches, big love",
    Icon: Heart,
  },
  { title: "Free Shipping", subtitle: "On orders above ₹999", Icon: Truck },
  {
    title: "Secure Checkout",
    subtitle: "Shop with confidence",
    Icon: ShieldCheck,
  },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Shortest signed distance from `active` to `index` on a loop of `total` items. */
function loopOffset(index: number, active: number, total: number) {
  let diff = index - active;
  const half = total / 2;
  if (diff > half) diff -= total;
  if (diff < -half) diff += total;
  return diff;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                               */
/* -------------------------------------------------------------------------- */

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div
      className="flex items-center gap-0.5 text-[#B28B55]"
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={1.5}
          className={i < rating ? "fill-current" : "fill-transparent"}
        />
      ))}
    </div>
  );
}

function TestimonialCard({
  review,
  interactive,
}: {
  review: Testimonial;
  interactive: boolean;
}) {
  const tabIndex = interactive ? 0 : -1;

  return (
    <article className="flex h-full w-full flex-col rounded-[22px] border border-white/80 bg-white/85 p-3 sm:p-4">
      {/* Product photo */}
      <Link
        href={`/products/${review.productSlug}`}
        tabIndex={tabIndex}
        aria-label={`View ${review.product}`}
        className="group/img relative block aspect-[1.75/1] w-full overflow-hidden rounded-[15px] bg-[#EEE5D9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B28B55]"
      >
        <Image
          src={review.productImage}
          alt={review.product}
          fill
          sizes="(max-width: 1023px) 86vw, 40vw"
          className="object-cover transition-transform duration-700 group-hover/img:scale-[1.04]"
        />
        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[#8A6540]/90 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm">
          Shop the product
          <ArrowUpRight size={12} />
        </span>
      </Link>

      {/* Stars + verification */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <StarRating rating={review.rating} />
        <span className="flex items-center gap-1.5 text-[11px] text-[#81766C] sm:text-xs">
          <BadgeCheck
            size={15}
            className="shrink-0 fill-[#B28B55] text-white"
          />
          Verified purchase
        </span>
      </div>

      {/* Review */}
      <p className="mt-3 flex-1 font-serif text-base leading-[1.6] text-[#45372C] sm:text-lg">
        “{review.text}”
      </p>

      {/* Reviewer */}
      <div className="mt-4 flex items-center gap-3 pt-1">
        <div
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E4D3BC] bg-[#F3E9DB] text-[#8A6540]"
        >
          <User size={20} strokeWidth={1.5} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#3D3026]">
            {review.name}
          </p>
          <p className="text-xs text-[#8B8076]">{review.city}</p>
        </div>

        <Link
          href={`/products/${review.productSlug}`}
          tabIndex={tabIndex}
          className="max-w-[48%] truncate rounded-full bg-[#F3EBE0] px-3 py-2 text-[11px] font-medium text-[#775638] transition-colors hover:bg-[#E9DCC9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B28B55]"
        >
          {review.product}
        </Link>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section                                                                    */
/* -------------------------------------------------------------------------- */

export default function Testimonials() {
  const total = testimonials.length;
  const isDesktop = useIsDesktop();
  const reduceMotion = useReducedMotion();

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  const next = useCallback(() => setActive((i) => (i + 1) % total), [total]);
  const prev = useCallback(
    () => setActive((i) => (i - 1 + total) % total),
    [total],
  );

  // Pause when the browser tab is in the background
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Auto-advance. Re-arms after every slide change, so manual clicks reset the timer.
  useEffect(() => {
    if (paused || tabHidden || reduceMotion) return;
    const id = window.setTimeout(next, AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [active, paused, tabHidden, reduceMotion, next]);

  function onPanEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -50) next();
    else if (info.offset.x > 50) prev();
  }

  // Desktop shows the centre card plus one on each side; mobile shows only the centre card.
  const sideX = isDesktop ? "92%" : "112%";
  const sideScale = isDesktop ? 0.76 : 0.9;
  const sideOpacity = isDesktop ? 0.92 : 0;

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby="testimonials-heading"
      className="relative isolate overflow-hidden bg-[#F7F3EE] pt-16 sm:pt-20 lg:pt-24"
    >
      {/* Botanical decoration (generated SVGs in /public/silknknot/decor) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 select-none"
      >
        <Image
          src="/silknknot/decor/branch-left.svg"
          alt=""
          width={260}
          height={330}
          unoptimized
          className="absolute -left-6 top-0 w-28 sm:-left-2 sm:w-44 lg:left-0 lg:w-[260px]"
        />
        <Image
          src="/silknknot/decor/branch-right.svg"
          alt=""
          width={340}
          height={380}
          unoptimized
          className="absolute -right-6 top-0 w-32 sm:-right-2 sm:w-52 lg:right-0 lg:w-[320px]"
        />
        <Image
          src="/silknknot/decor/petal.svg"
          alt=""
          width={80}
          height={104}
          unoptimized
          className="absolute left-[6%] top-6 hidden w-9 rotate-[-12deg] opacity-90 sm:block lg:left-[3%] lg:top-8 lg:w-12"
        />
        <Image
          src="/silknknot/decor/petal.svg"
          alt=""
          width={80}
          height={104}
          unoptimized
          className="absolute left-[8%] top-[210px] hidden w-8 rotate-[28deg] opacity-60 lg:block"
        />
      </div>

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#9A7043] sm:text-xs">
            Kind words, real rituals
          </p>

          <h2
            id="testimonials-heading"
            className="mt-3 font-serif text-5xl tracking-[-0.04em] text-[#382B20] sm:text-6xl lg:text-7xl"
          >
            Loved <span className="italic text-[#B28B55]">by you.</span>
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#796E63] sm:text-base">
            Real stories from our beautiful community. Thank you for being part
            of the Silken Knot journey.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <StarRating rating={5} size={20} />
              <span className="text-base font-medium text-[#5A3D27]">
                {OVERALL_RATING}/5
              </span>
            </div>
            <span className="hidden h-6 w-px bg-[#D9CBB9] sm:block" />
            <span className="text-xs text-[#81766C] sm:text-sm">
              Based on {OVERALL_COUNT} happy customers
            </span>
          </div>
        </div>

        {/* Carousel */}
        <div
          className="relative mt-10 sm:mt-14"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          aria-live={paused ? "polite" : "off"}
        >
          <motion.div
            onPanEnd={onPanEnd}
            style={{ touchAction: "pan-y" }}
            className="grid place-items-center py-8"
          >
            {testimonials.map((review, index) => {
              const offset = loopOffset(index, active, total);
              const isCenter = offset === 0;
              const isSide = Math.abs(offset) === 1;
              const direction = offset < 0 ? -1 : 1;

              const animate = isCenter
                ? { x: "0%", scale: 1, opacity: 1 }
                : isSide
                  ? {
                      x: `${direction * parseFloat(sideX)}%`,
                      scale: sideScale,
                      opacity: sideOpacity,
                    }
                  : { x: `${direction * 190}%`, scale: 0.6, opacity: 0 };

              return (
                <motion.div
                  key={review.id}
                  initial={false}
                  animate={animate}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          type: "spring",
                          stiffness: 140,
                          damping: 22,
                          mass: 0.9,
                        }
                  }
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${total}`}
                  aria-hidden={
                    !isCenter && !isSide ? true : !isDesktop && !isCenter
                  }
                  onClick={(e) => {
                    if (isCenter || !isDesktop) return;
                    if ((e.target as HTMLElement).closest("a")) return;
                    setActive(index);
                  }}
                  style={{
                    gridArea: "1 / 1",
                    zIndex: isCenter ? 10 : isSide ? 5 : 0,
                    pointerEvents:
                      isCenter || (isSide && isDesktop) ? "auto" : "none",
                  }}
                  className={`w-[88%] sm:w-[70%] lg:w-[38%] ${
                    isCenter ? "" : isSide && isDesktop ? "cursor-pointer" : ""
                  }`}
                >
                  <div
                    className={`rounded-[22px] backdrop-blur-sm transition-shadow duration-500 ${
                      isCenter
                        ? "shadow-[0_24px_60px_rgba(91,66,39,0.14)]"
                        : "shadow-[0_10px_34px_rgba(91,66,39,0.07)]"
                    }`}
                  >
                    <TestimonialCard
                      review={review}
                      interactive={isCenter || (isSide && isDesktop)}
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Arrows */}
          <button
            type="button"
            onClick={prev}
            aria-label="Previous review"
            className="absolute left-0 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#6C4931] shadow-[0_6px_22px_rgba(91,66,39,0.14)] transition-colors hover:bg-[#6C4931] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B28B55] lg:-left-2"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next review"
            className="absolute right-0 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#6C4931] shadow-[0_6px_22px_rgba(91,66,39,0.14)] transition-colors hover:bg-[#6C4931] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B28B55] lg:-right-2"
          >
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Dots */}
        <div
          className="mt-2 flex justify-center gap-2"
          role="tablist"
          aria-label="Choose review"
        >
          {testimonials.map((review, index) => (
            <button
              key={review.id}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Show review ${index + 1}`}
              onClick={() => setActive(index)}
              className="flex h-5 items-center focus-visible:outline-none"
            >
              <span
                className={`block h-2 rounded-full transition-all duration-500 ${
                  index === active ? "w-6 bg-[#B28B55]" : "w-2 bg-[#D9CDBD]"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
