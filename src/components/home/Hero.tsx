import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-[calc(100svh-var(--announce-h))] overflow-hidden bg-[#e7dccb]" aria-label="Body care, bath, and scent">
      <img
        src="/silknknot/hero-care.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#f3eadc]/88 via-[#f3eadc]/45 to-transparent md:via-[#f3eadc]/20" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-var(--announce-h))] max-w-[1280px] items-center px-5 pb-16 pt-28 md:px-14">
        <div className="max-w-xl">
          <p className="text-[12px] font-medium uppercase tracking-[0.28em] text-[#6f675d]">
            Body care, bath, and scent
          </p>
          <h1 className="mt-5 font-serif text-[clamp(2.8rem,5.2vw,4.6rem)] font-medium leading-[1.05] tracking-[-0.02em] text-[#2c2926]">
            A little care
            <span className="block">goes a long way</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#4e483f] md:text-lg">
            Butters, soaps, scrubs, and candles for the hour after bathing. Small batches, made to be used every day.
          </p>
          <Link
            href="/shop?bestseller=1"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#243028] px-6 py-3 text-sm text-white transition-colors duration-300 hover:bg-[#1a2420]"
          >
            Shop best sellers
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
