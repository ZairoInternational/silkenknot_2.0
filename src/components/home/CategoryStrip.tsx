"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { Media } from "@/components/ui";

export function CategoryStrip() {
  const store = useStore();
  return (
    <section className="bg-paper px-5 py-8 md:px-12 md:py-10" aria-label="Categories">
      <ul className="mx-auto grid max-w-[1440px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {store.categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/shop?category=${category.id}`}
              className="group flex h-full items-center gap-3 rounded-2xl border border-line bg-white p-2 pr-4 transition duration-300 hover:-translate-y-0.5 hover:border-ink"
            >
              <span className="relative block size-20 shrink-0 overflow-hidden rounded-xl bg-cream">
                <Media
                  src={category.image}
                  alt=""
                  sizes="80px"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-2xl leading-none">{category.name}</span>
                <span className="mt-2 line-clamp-2 text-xs leading-relaxed text-mute">{category.description}</span>
              </span>
              <ArrowUpRight
                size={16}
                className="shrink-0 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
