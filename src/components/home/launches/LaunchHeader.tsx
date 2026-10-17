import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function LaunchHeader() {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#8a7350]">Just arrived</p>
        <h2 id="new-launches-heading" className="mt-3 font-serif text-[clamp(2.1rem,5vw,3.6rem)] font-medium leading-[0.95] tracking-[-0.03em] text-[#2c2926]">
          Meet your new rituals
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[#6f675d] md:text-base">
          The newest butter, soap, candle, and linen, still close to the day they arrived.
        </p>
      </div>
      <Link
        href="/shop?sort=newest"
        className="group inline-flex w-fit items-center gap-2 text-sm text-[#2c2926] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8a7350]"
      >
        <span className="border-b border-[#2c2926]/30 pb-0.5 transition-colors duration-300 group-hover:border-[#CBAC7C]">
          View all new arrivals
        </span>
        <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
      </Link>
    </div>
  );
}
