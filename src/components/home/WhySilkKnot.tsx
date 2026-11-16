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
    <section className="bg-mist-cool px-5 py-14 md:px-8 md:py-20" aria-labelledby="why-silken-knot-heading">
      <div className="site-container grid gap-10 md:grid-cols-2 md:gap-16 md:items-center">
        <div className="relative aspect-[4/5] overflow-hidden bg-sand sm:aspect-[3/2]">
          <Media
            src={media.whySilkKnot}
            alt="Silken Knot body butter"
            sizes="(min-width: 768px) 46vw, 90vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-mist-ink">Why Silken Knot</p>
          <h2
            id="why-silken-knot-heading"
            className="mt-3 font-serif text-[clamp(2.4rem,6vw,3.75rem)] font-medium leading-[1.05] tracking-[-0.03em] text-ink"
          >
            Soft. Honest. Daily.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-ink/80 md:text-lg md:leading-8">
            The bath is the first step. What follows should feel soft, rinse clean, and be ready before you get dressed.
            Butters, sugars, salts, and wax are named on the label, and each jar is made in a small batch.
          </p>
          <ul className="mt-10 grid w-full grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-line">
            {points.map((point) => (
              <li key={point.label} className="flex flex-col items-center px-2 text-center text-ink sm:px-3">
                <span className="grid size-14 place-items-center rounded-full border border-mist/50 bg-paper text-mist-ink md:size-16">
                  <point.icon size={24} strokeWidth={1.25} />
                </span>
                <p className="mt-3 whitespace-pre-line text-sm font-medium leading-5 text-ink md:text-base">{point.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
