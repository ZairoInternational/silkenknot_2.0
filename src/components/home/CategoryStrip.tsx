"use client";

import Link from "next/link";
import { Media } from "@/components/ui";
import { useSiteMedia } from "@/lib/site-media/client";

export function CategoryStrip() {
  const media = useSiteMedia();
  const circles = media.categoryStrip;

  return (
    <section className="border-b border-line bg-paper px-5 py-14 md:px-10 md:py-16" aria-labelledby="shop-by-type-heading">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-9 text-center md:mb-11">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-mist-ink">Browse</p>
          <h2
            id="shop-by-type-heading"
            className="mt-2 font-serif text-[clamp(2rem,4.5vw,2.85rem)] font-medium tracking-[-0.02em] text-ink"
          >
            Shop by type
          </h2>
        </div>
        <ul className="flex items-start justify-between gap-6 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {circles.map((item) => (
            <li key={item.id || item.name} className="shrink-0">
              <Link
                href={item.href}
                className="group flex w-[112px] cursor-pointer flex-col items-center gap-4 text-center md:w-[140px]"
              >
                <span className="relative block size-[104px] overflow-hidden rounded-full bg-mist-cool ring-4 ring-white transition duration-300 group-hover:ring-mist/50 md:size-[128px]">
                  <Media
                    src={item.image}
                    alt=""
                    sizes="128px"
                    className="object-cover transition duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </span>
                <span className="text-[15px] font-medium tracking-wide text-ink transition-colors duration-200 group-hover:text-mist-ink md:text-base">
                  {item.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
