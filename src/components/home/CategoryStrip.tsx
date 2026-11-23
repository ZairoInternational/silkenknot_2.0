"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { ease, Media, Reveal, usePrefersReducedMotion } from "@/components/ui";
import { useSiteMedia } from "@/lib/site-media/client";

const CATEGORY_BLURBS: Record<string, string> = {
  "body-butter": "Melts in slow — leaves skin soft for hours",
  "whipped-soap": "A cloud of lather that cleans without stripping",
  "sugar-scrub": "Polish the day away; wake up to silk-smooth skin",
  "bath-salts": "Warm water, quiet mind — the evening reset",
  soap: "Gentle cleanse that still feels like a treat",
  candles: "Light the room. Soften the hour.",
};

export function CategoryStrip() {
  const media = useSiteMedia();
  const circles = media.categoryStrip;
  const reduced = usePrefersReducedMotion();

  return (
    <section
      className="relative isolate overflow-x-clip border-b border-line"
      aria-labelledby="shop-by-type-heading"
    >
      <motion.div
        className="absolute inset-0"
        initial={reduced ? false : { scale: 1.03 }}
        whileInView={reduced ? undefined : { scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease }}
      >
        <div className="absolute inset-0 md:hidden">
          <Media
            src="/silknknot/category-shop-hero-mobile.jpg"
            alt="Woman applying Silken Knot cream"
            priority
            sizes="100vw"
            className="object-cover object-[center_12%]"
          />
        </div>
        <div className="absolute inset-0 hidden md:block">
          <Media
            src="/silknknot/category-shop-hero-v2.jpg"
            alt="Woman applying Silken Knot cream"
            priority
            sizes="100vw"
            className="object-cover object-[center_18%]"
          />
        </div>
      </motion.div>
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/25 via-ink/5 to-ink/55 md:from-ink/10 md:via-transparent md:to-ink/40"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-[min(92vw,620px)] w-full max-w-[1520px] flex-col px-4 pb-10 pt-8 sm:min-h-[640px] sm:px-6 md:min-h-[760px] md:px-10 md:pb-14 md:pt-14 lg:px-12">
        <Reveal className="ml-auto mr-0 w-[min(100%,15.5rem)] text-right sm:mr-4 sm:w-[17rem] md:mr-6 md:w-[20rem] lg:mr-10">
          <p className="mb-2.5 flex items-center justify-end gap-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne sm:text-[11px]">
            A ritual for every texture
            <span className="h-px w-8 bg-champagne/80 sm:w-10" aria-hidden />
          </p>
          <h2
            id="shop-by-type-heading"
            className="font-serif text-[clamp(1.85rem,3.6vw,2.7rem)] font-medium leading-[1.15] tracking-[-0.02em] text-paper [text-shadow:0_1px_2px_rgba(0,0,0,0.4),0_6px_20px_rgba(0,0,0,0.25)]"
          >
            Shop by how you care
          </h2>
          <p className="mt-2.5 text-[13px] leading-snug text-paper/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.35)] sm:text-sm md:text-[15px]">
            Butter, scrub, soak, or scent — choose the form that fits this moment.
          </p>
          <span className="mt-3 ml-auto flex w-14 items-center justify-end gap-1.5 text-mist" aria-hidden>
            <span className="h-px flex-1 bg-current/70" />
            <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none">
              <path
                d="M12 20c1.8-2.2 3.4-3.6 4.8-4.2 1.1-.5 1.7-1.4 1.7-2.5 0-1.6-1.3-2.8-2.9-2.8-.6 0-1.1.2-1.6.4C13.4 8.6 12.7 6.8 12 5c-.7 1.8-1.4 3.6-2 5.9-.5-.2-1-.4-1.6-.4-1.6 0-2.9 1.2-2.9 2.8 0 1.1.6 2 1.7 2.5C8.6 16.4 10.2 17.8 12 20Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </Reveal>

        <Reveal className="mt-auto w-full pt-8 md:pt-12">
          <ul className="-mx-4 flex items-stretch gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:justify-center sm:gap-4 sm:px-0 md:gap-5 [&::-webkit-scrollbar]:hidden">
            {circles.map((item, index) => {
              const blurb = CATEGORY_BLURBS[item.id] ?? "Step into this collection";
              return (
                <li key={item.id || item.name} className="shrink-0">
                  <motion.div
                    initial={reduced ? false : { opacity: 0, y: 18 }}
                    whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: index * 0.05, ease }}
                    whileHover={reduced ? undefined : { y: -6 }}
                  >
                    <Link
                      href={item.href}
                      className="group flex w-[136px] cursor-pointer flex-col items-center bg-paper px-2 pb-5 pt-2 text-center shadow-[0_16px_34px_-18px_rgba(17,17,17,0.4)] transition duration-300 hover:shadow-[0_20px_38px_-16px_rgba(95,164,173,0.32)] sm:w-[150px] sm:px-2.5 sm:pb-6 sm:pt-2.5 md:w-[176px] [border-radius:999px_999px_48px_48px]"
                    >
                      {/* Semi-circle top + circular image — cream rim mirrors the dome */}
                      <span className="relative aspect-square w-full overflow-hidden rounded-full bg-sand">
                        <Media
                          src={item.image}
                          alt=""
                          sizes="(max-width: 768px) 136px, 176px"
                          className="object-cover transition duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                        />
                      </span>
                      <span className="mt-3.5 font-serif text-[16px] font-medium leading-tight tracking-[-0.01em] text-ink sm:mt-4 sm:text-[18px] md:text-[20px]">
                        {item.name}
                      </span>
                      <span className="mt-1.5 min-h-[2.9rem] max-w-[9.5rem] text-[12px] leading-snug text-mute sm:mt-2 sm:text-[13px] md:max-w-[10.5rem] md:text-[14px]">
                        {blurb}
                      </span>
                      <span className="mt-2.5 grid size-8 place-items-center rounded-full bg-champagne text-ink transition duration-300 group-hover:bg-mist group-hover:text-white motion-reduce:transition-none sm:mt-3 sm:size-9">
                        <ArrowRight size={15} strokeWidth={1.75} aria-hidden />
                        <span className="sr-only">Shop {item.name}</span>
                      </span>
                    </Link>
                  </motion.div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
