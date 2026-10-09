"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { ritualChapters, seedCategories, seedProducts } from "@/lib/data";
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

const tiles = [
  { ...seedCategories[0], className: "md:col-span-7 md:row-span-2 min-h-[78vw] md:min-h-[760px]", href: "/shop?category=body-care" },
  { ...seedCategories[1], className: "md:col-span-5 min-h-[70vw] md:min-h-0", href: "/shop?category=bath-soap" },
  { ...seedCategories[2], className: "md:col-span-5 min-h-[70vw] md:min-h-0", href: "/shop?category=aromatherapy" },
  { ...seedCategories[3], className: "md:col-span-12 min-h-[70vw] md:min-h-[420px]", href: "/shop?category=lifestyle" },
];

export function CategorySection() {
  return (
    <section className="bg-paper px-5 py-24 md:px-10 md:py-36">
      <Reveal>
        <p className="eyebrow text-mute">The house</p>
        <h2 className="mt-4 max-w-3xl font-serif text-5xl leading-[0.95] md:text-7xl">Four ways to begin.</h2>
      </Reveal>
      <div className="mt-14 grid gap-3 md:grid-cols-12 md:grid-rows-2">
        {tiles.map((tile, index) => (
          <Link key={tile.id} href={tile.href} className={`group relative block overflow-hidden bg-sand ${tile.className}`}>
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 1.08 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <Media
                src={tile.image}
                alt=""
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-contain transition duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-0 opacity-0 transition duration-700 group-hover:opacity-100">
                <Media src={tile.imageAlt} alt="" sizes="(min-width: 768px) 50vw, 100vw" className="object-contain" />
              </span>
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-paper md:p-8">
              <p className="eyebrow text-paper/70">0{index + 1}</p>
              <h3 className="mt-2 font-serif text-4xl transition duration-500 group-hover:-translate-y-1 md:text-5xl">{tile.name}</h3>
              <p className="mt-3 max-w-sm text-sm text-paper/80">{tile.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
                Explore <ArrowUpRight size={14} className="transition group-hover:translate-x-1 group-hover:-translate-y-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
