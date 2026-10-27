import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { ArrowRight, Leaf, ShieldCheck, Truck } from "lucide-react";
import { SiteChrome } from "@/components/providers";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});



export default function NotFound() {
  return (
    <SiteChrome>
      <div className="bg-[#f9f4ee]">
        <section className="relative isolate min-h-[min(92svh,920px)] overflow-hidden">
          {/* Full-bleed scene — jar stays pinned to the bottom */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/silknknot/404-jar-hero.jpg"
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-bottom"
          />

          {/* Copy sits in the open cream area above the jar */}
          <div className="relative z-10 mx-auto flex min-h-[min(92svh,920px)] max-w-[920px] flex-col items-center px-5 pb-[min(42vw,380px)] pt-10 text-center md:pb-[min(36vw,420px)] md:pt-16">
            <div className="relative inline-flex select-none items-center justify-center" aria-hidden>
              <p
                className={`${display.className} text-[7.5rem] font-medium leading-none tracking-tight text-[#5d4737] md:text-[10.5rem]`}
              >
                <span>4</span>
                <span className="relative inline-block px-[0.02em]">
                  0
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/silknknot/404-blossom-branch.png"
                    alt=""
                    className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[1.15em] w-auto max-w-none -translate-x-1/2 -translate-y-[48%] mix-blend-multiply opacity-95"
                  />
                </span>
                <span>4</span>
              </p>
            </div>

            <h1
              className={`${display.className} mt-6 text-[1.85rem] font-medium leading-tight tracking-tight text-[#5d4737] md:mt-8 md:text-[2.35rem]`}
            >
              Oops... This page is gone
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#8a7b6c] md:text-[0.95rem]">
              The page you are looking for might have been moved, deleted or never existed.
            </p>

            <Link
              href="/"
              className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-[#b89a74] px-7 text-sm font-medium text-white transition hover:bg-[#a88964] md:mt-8"
            >
              Back to Home
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
            </Link>
          </div>
        </section>
      </div>
    </SiteChrome>
  );
}
