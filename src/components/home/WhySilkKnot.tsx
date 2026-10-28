"use client";

import { Feather, Heart, Leaf, Sparkles } from "lucide-react";
import { Media } from "@/components/ui";
import { useSiteMedia } from "@/lib/site-media/client";

const points = [
  { icon: Leaf, label: "Simple\nformulas" },
  { icon: Heart, label: "Small\nbatches" },
  { icon: Sparkles, label: "Rinses\nclean" },
  { icon: Feather, label: "Quiet\nscents" },
];

export function WhySilkKnot() {
  const media = useSiteMedia();

  return (
    <section className="mt-6 hidden bg-[#fbf9f6] px-5 py-6 md:block md:px-8">
      <div className="site-container grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="relative aspect-[3/2] overflow-hidden rounded-[1.75rem] bg-[#e7dfd4]">
          <Media src={media.whySilkKnot} alt="Silken Knot body butter" sizes="(min-width: 768px) 46vw, 90vw" className="object-cover" />
        </div>
        <div className="flex flex-col md:h-full">
          <p className="text-xl font-medium uppercase tracking-[0.16em] text-[#3f3d37] md:text-2xl">Why Silken Knot</p>
          <div className="py-4 md:flex md:flex-1 md:flex-col md:justify-center md:py-0">
            <h2 className="font-serif text-5xl leading-[1.1] text-[#2c2926] md:text-6xl">Soft. Honest. Daily.</h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-[#6f675d]">
              The bath is the first step. What follows should feel soft, rinse clean, and be ready before you get dressed.
              Butters, sugars, salts, and wax are named on the label, and each jar is made in a small batch.
            </p>
          </div>
          <ul className="grid w-full grid-cols-4 divide-x divide-[#e6e0d6]">
            {points.map((point) => (
              <li key={point.label} className="flex flex-col items-center px-3 text-center text-[#5c564e]">
                <span className="grid size-16 place-items-center rounded-full border border-[#d9d2c8]">
                  <point.icon size={26} strokeWidth={1.25} />
                </span>
                <p className="mt-3 whitespace-pre-line text-base leading-5">{point.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
