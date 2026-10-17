import Link from "next/link";
import { Media } from "@/components/ui";

const circles = [
  { name: "Body Butter", href: "/shop?type=Body%20Butter", image: "/silknknot/body_butter.jpg" },
  { name: "Whipped Soap", href: "/shop?type=Whipped%20Soap", image: "/silknknot/whipped_shop.jpg" },
  { name: "Sugar Scrub", href: "/shop?type=Sugar%20Scrub", image: "/silknknot/sugar_scrap1.jpg" },
  { name: "Bath Salts", href: "/shop?type=Bath%20Salts", image: "/silknknot/bath_salts1.jpg" },
  { name: "Soap", href: "/shop?category=bath-soap", image: "/silknknot/soap1.webp" },
  { name: "Candles", href: "/shop?category=aromatherapy", image: "/silknknot/candle1.jpg" },
];

export function CategoryStrip() {
  return (
    <section className="bg-white px-5 py-12 md:px-10 md:py-14" aria-label="Shop by type">
      <ul className="mx-auto flex max-w-[1200px] items-start justify-between gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {circles.map((item) => (
          <li key={item.name} className="shrink-0">
            <Link href={item.href} className="group flex w-[112px] flex-col items-center gap-4 text-center md:w-[140px]">
              <span className="relative block size-[104px] overflow-hidden rounded-full bg-[#e7dfd4] shadow-[0_10px_28px_-16px_rgba(28,27,25,0.55)] ring-4 ring-white transition duration-300 group-hover:scale-105 md:size-[128px]">
                <Media src={item.image} alt="" sizes="128px" className="object-cover" />
              </span>
              <span className="text-sm font-medium tracking-wide text-ink md:text-base">{item.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
