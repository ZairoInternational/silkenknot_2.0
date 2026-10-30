"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ritualChapters, seedProducts } from "@/lib/data";
import { useSiteMedia } from "@/lib/site-media/client";
import { useStore } from "@/lib/store";
import { Media, Reveal } from "@/components/ui";

export function RitualChapters() {
  const store = useStore();

  return (
    <section id="ritual" className="relative z-10 bg-cream px-5 py-20 md:px-12 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <Reveal>
          <p className="eyebrow text-mute">The ritual</p>
          <h2 className="mt-3 max-w-xl font-serif text-5xl leading-[0.95] md:text-6xl">Four steps, then you are done.</h2>
        </Reveal>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ritualChapters.map((chapter) => {
            const product = store.products.find((item) => item.id === chapter.productId) ?? seedProducts.find((item) => item.id === chapter.productId);
            if (!product) return null;
            return (
              <li key={chapter.id}>
                <Link
                  href={`/products/${product.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-black/10 bg-white p-3 transition duration-300 hover:-translate-y-0.5 hover:border-ink"
                >
                  <span className="relative block aspect-square overflow-hidden rounded-xl bg-sand">
                    <Media src={product.images[0]} alt={product.name} sizes="(min-width: 1024px) 22vw, 50vw" className="object-contain" />
                  </span>
                  <span className="mt-4 px-1 font-serif text-4xl text-stone">{chapter.index}</span>
                  <span className="mt-1 px-1 font-serif text-3xl">{chapter.title}</span>
                  <span className="mt-2 flex-1 px-1 text-sm text-mute">{chapter.copy}</span>
                  <span className="mt-4 inline-flex items-center gap-2 px-1 pb-1 text-[11px] uppercase tracking-[0.16em]">
                    {product.name}
                    <ArrowUpRight size={14} className="transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function CategorySection() {
  const media = useSiteMedia();
  const collections = [
    {
      number: "01",
      title: "Body Care",
      description: "Nourish your skin with nature's finest ingredients.",
      image: media.collectionBodyCare,
      href: "/shop?category=body-care",
      className: "md:col-span-7 md:row-span-2",
    },
    {
      number: "02",
      title: "Bath & Soap",
      description: "Gentle care for body and mind.",
      image: media.collectionBathSoap,
      href: "/shop?category=bath-soap",
      className: "md:col-span-5",
    },
    {
      number: "03",
      title: "Aromatherapy",
      description: "Find your calm, naturally.",
      image: media.bestsellerCandle,
      href: "/shop?category=aromatherapy",
      className: "md:col-span-5",
    },
  ];

  return (
    <section className="bg-[#f7f4ef] px-4 py-14 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-7 sm:mb-9">
          <p className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#59634b]">
            <span className="h-px w-7 bg-[#59634b]" />
            Explore the collections
          </p>
          <h2 className="font-serif text-3xl leading-tight tracking-tight text-[#292d25] sm:text-4xl lg:text-5xl">Three ways to begin.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#817c71] sm:text-base">
            Discover your self-care ritual — from nourishing body care to calming scents, thoughtfully crafted for your everyday moments.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:grid-rows-[225px_225px] lg:gap-4">
          {collections.map((collection) => (
            <Link
              key={collection.number}
              href={collection.href}
              className={`group relative min-h-[260px] overflow-hidden rounded-lg bg-[#ded5c8] md:min-h-0 ${collection.className}`}
            >
              <Media
                src={collection.image}
                alt={collection.title}
                sizes="(min-width: 768px) 60vw, 100vw"
                className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent transition duration-500 group-hover:from-black/75" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/5" />
              <div className="relative flex h-full max-w-[390px] flex-col items-start justify-center p-5 text-white sm:p-7 lg:p-9">
                <span className="mb-3 text-[10px] font-medium tracking-[0.22em] text-white/85">{collection.number} /</span>
                <h3 className="font-serif text-3xl leading-tight tracking-tight sm:text-4xl lg:text-[42px]">{collection.title}</h3>
                <p className="mt-2 max-w-[260px] font-serif text-sm leading-6 text-white/90 sm:text-base">{collection.description}</p>
                <span className="mt-5 inline-flex min-h-10 items-center gap-3 rounded-full border border-white/60 bg-[#CBAC7C]/90 px-4 py-2 text-[11px] font-medium tracking-wide text-white backdrop-blur-sm transition duration-300 group-hover:border-mist group-hover:bg-[#CBAC7C] sm:px-5 sm:text-xs">
                  Explore Collection
                  <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
