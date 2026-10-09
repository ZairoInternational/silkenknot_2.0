import Link from "next/link";

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
    <section className="bg-[#f7f4ef] px-5 py-10 md:px-10" aria-label="Shop by type">
      <ul className="mx-auto flex max-w-[1100px] justify-between gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {circles.map((item) => (
          <li key={item.name} className="shrink-0">
            <Link href={item.href} className="group flex w-[92px] flex-col items-center gap-3 text-center md:w-[108px]">
              <span className="relative block size-[84px] overflow-hidden rounded-full bg-[#e7dfd4] ring-1 ring-black/5 transition duration-300 group-hover:ring-black/20 md:size-[104px]">
                <img src={item.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </span>
              <span className="text-sm text-[#3c3834]">{item.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
