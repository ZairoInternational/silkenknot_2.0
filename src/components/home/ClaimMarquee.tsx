import { Atom, Carrot, Droplet, Feather, HandHeart, Heart, Leaf, Rabbit, SunMedium, Tag } from "lucide-react";

const claims = [
  { label: "Simple formulas", icon: Leaf },
  { label: "Small batches", icon: Heart },
  { label: "Rinses clean", icon: Droplet },
  { label: "Quiet scents", icon: Feather },
  { label: "Named on the label", icon: Tag },
  { label: "Used every day", icon: SunMedium },
  { label: "Paraben free", icon: Carrot },
  { label: "Sulfate free", icon: Atom },
  { label: "Microplastic free", icon: Droplet },
  { label: "Cruelty-free", icon: Rabbit },
  { label: "Plant-based", icon: Leaf },
  { label: "Made in India", icon: HandHeart },
];

export function ClaimMarquee() {
  return (
    <section className="claim-strip group mt-6 overflow-hidden bg-[#efeae3] py-5 text-ink/70" aria-label="How Silken Knot is made">
      <div className="silk-marquee claim-marquee flex w-max items-center group-hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex items-center" aria-hidden={copy === 1}>
            {claims.map((claim) => (
              <li key={claim.label} className="flex items-center gap-4 px-8">
                <span className="text-[13px] font-medium uppercase tracking-[0.16em]">{claim.label}</span>
                <span className="grid size-11 place-items-center rounded-full border border-current">
                  <claim.icon size={18} strokeWidth={1.25} />
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
