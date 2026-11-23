import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function LaunchHeader() {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xl">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-mist-ink">
          <span className="h-px w-8 bg-mist" aria-hidden />
          Just arrived
        </p>
        <h2
          id="new-launches-heading"
          className="mt-3 font-serif text-[clamp(2.2rem,5vw,3.5rem)] font-medium leading-[0.98] tracking-[-0.03em] text-ink"
        >
          Meet your new rituals
        </h2>
        <p className="mt-3 max-w-md text-base leading-relaxed text-ink/80 md:text-lg">
          The newest butter, soap, and candle, still close to the day they arrived.
        </p>
      </div>
      <Link
        href="/shop?sort=newest"
        className="group inline-flex w-fit shrink-0 cursor-pointer items-center gap-3 rounded-full bg-ink py-1.5 pl-6 pr-1.5 text-sm text-paper transition-colors hover:bg-midnight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        View all new arrivals
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-paper text-ink transition-transform duration-300 ease-out group-hover:rotate-45 motion-reduce:transition-none motion-reduce:group-hover:rotate-0">
          <ArrowRight size={16} />
        </span>
      </Link>
    </div>
  );
}
