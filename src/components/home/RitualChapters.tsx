"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
    <section className="bg-[#ffffff] px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-[1440px]">
        <Reveal>
          <div className="mb-9 flex flex-col gap-6 sm:mb-11 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a7350]">
                <span className="h-px w-8 bg-[#61A2AF]" aria-hidden />
                Explore the collections
              </p>
              <h2 className="mt-3 font-serif text-3xl leading-[1.05] tracking-tight text-[#292d25] sm:text-4xl lg:text-5xl">
                Three ways to begin.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#6f675d] sm:text-base">
                Discover your self-care ritual — from nourishing body care to calming scents, thoughtfully crafted for your everyday moments.
              </p>
            </div>
            <Link
              href="/shop"
              className="group/all inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#61A2AF] bg-white px-5 py-2.5 text-sm text-[#2c2926] shadow-[0_2px_8px_rgba(44,41,38,0.04)] transition-colors duration-300 hover:bg-[#61A2AF] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61A2AF]"
            >
              Shop all
              <ArrowUpRight
                size={15}
                className="transition-transform duration-300 group-hover/all:translate-x-0.5 group-hover/all:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/all:translate-x-0 motion-reduce:group-hover/all:translate-y-0"
              />
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-[minmax(240px,1fr)_minmax(240px,1fr)] lg:gap-5">
          {collections.map((collection) => (
            <Link
              key={collection.number}
              href={collection.href}
              className={`group relative min-h-[300px] cursor-pointer overflow-hidden rounded-2xl bg-[#ded5c8] shadow-[0_2px_10px_rgba(44,41,38,0.06)] transition-[box-shadow,transform] duration-300 ease-out hover:shadow-[0_14px_36px_rgba(44,41,38,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61A2AF] motion-reduce:transition-colors md:min-h-0 ${collection.className}`}
            >
              <Media
                src={collection.image}
                alt={collection.title}
                sizes="(min-width: 768px) 60vw, 100vw"
                className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10 transition-opacity duration-300 group-hover:from-black/80" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-transparent" />

              <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 lg:p-8">
                <span className="mb-3 inline-flex w-fit items-center rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-white backdrop-blur-md">
                  {collection.number}
                </span>
                <h3 className="max-w-[20ch] font-serif text-3xl leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.65rem]">
                  {collection.title}
                </h3>
                <p className="mt-2 max-w-[28ch] text-sm leading-6 text-white/88 sm:text-[15px]">
                  {collection.description}
                </p>
                <span className="mt-5 inline-flex w-fit items-center gap-3 rounded-full bg-[#61A2AF] py-1.5 pl-5 pr-1.5 text-sm font-medium tracking-[0.02em] text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-colors duration-300 group-hover:bg-[#4F8A96] sm:pl-6">
                  Explore Collection
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-white text-[#1c1b19] transition-transform duration-300 ease-out group-hover:rotate-45 motion-reduce:transition-none motion-reduce:group-hover:rotate-0">
                    <ArrowUpRight size={16} />
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
