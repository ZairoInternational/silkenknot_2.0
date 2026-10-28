"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Media } from "@/components/ui";
import { useSiteMedia } from "@/lib/site-media/client";

export function ExploreCollections() {
  const media = useSiteMedia();
  const row = useRef<HTMLDivElement>(null);
  const collections = [
    { name: "Body Care", href: "/shop?category=body-care", image: media.collectionBodyCare },
    { name: "Bath & Shower", href: "/shop?category=body-care", image: media.collectionBathSoap },
    { name: "Soaps", href: "/shop?category=bath-soap", image: media.bestsellerSoap },
    { name: "Candles", href: "/shop?category=aromatherapy", image: media.bestsellerCandle },
  ];

  const scroll = (direction: number) => {
    const frame = row.current;
    if (!frame) return;
    const card = frame.querySelector("a");
    const amount = card ? card.clientWidth + 16 : frame.clientWidth * 0.8;
    frame.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <section className="mt-6 bg-[#f7f4ef] px-5 py-8 md:px-8 md:py-10">
      <div className="site-container">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="whitespace-nowrap text-[clamp(1.4rem,6.6vw,1.95rem)] font-medium tracking-[-0.04em] text-[#2c2926] md:whitespace-normal md:text-5xl md:tracking-normal">Explore Our Collections</h2>
            <p className="mt-2 text-[#6f675d]">Find your favorite self-care essentials.</p>
          </div>
          <div className="hidden gap-2 md:flex">
            <button type="button" aria-label="Previous collections" onClick={() => scroll(-1)} className="grid size-10 place-items-center rounded-full border border-[#ddd6cc] bg-white text-[#2c2926] hover:bg-[#f3eee8]">
              <ArrowLeft size={16} />
            </button>
            <button type="button" aria-label="Next collections" onClick={() => scroll(1)} className="grid size-10 place-items-center rounded-full border border-[#ddd6cc] bg-white text-[#2c2926] hover:bg-[#f3eee8]">
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <div ref={row} className="mt-8 flex snap-x gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {collections.map((collection) => (
            <Link key={collection.name} href={collection.href} className="group relative block aspect-[5/4] w-[72%] shrink-0 snap-start overflow-hidden rounded-2xl bg-[#e7dfd4] sm:w-[46%] lg:w-[calc(25%-12px)]">
              <Media src={collection.image} alt="" sizes="(min-width: 1024px) 22vw, 70vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 text-white">
                <span className="inline-flex items-center gap-2 text-base font-medium">
                  {collection.name}
                  <ArrowRight size={16} />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
