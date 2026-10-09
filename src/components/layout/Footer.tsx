import Link from "next/link";
import { Mark } from "@/components/ui";

const columns = [
  {
    title: "Shop",
    links: [
      ["Body Care", "/shop?category=body-care"],
      ["Bath", "/shop?type=Bath%20Salts,Sugar%20Scrub,Whipped%20Soap"],
      ["Soap", "/shop?category=bath-soap"],
      ["Candles", "/shop?category=aromatherapy"],
      ["Lifestyle", "/shop?category=lifestyle"],
      ["Best Sellers", "/shop?bestseller=1"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Contact", "/contact"],
      ["Shipping", "/shipping"],
      ["Returns", "/returns"],
      ["FAQ", "/faq"],
    ],
  },
  {
    title: "About",
    links: [
      ["Our Story", "/about"],
      ["Ingredients", "/ingredients"],
      ["Journal", "/journal"],
    ],
  },
  {
    title: "Social",
    links: [
      ["Instagram", "https://www.instagram.com"],
      ["Facebook", "https://www.facebook.com"],
      ["Pinterest", "https://www.pinterest.com"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 md:grid-cols-[1.3fr_repeat(4,1fr)] md:px-10 md:py-24">
        <div>
          <p className="inline-flex items-center gap-2 font-serif text-3xl">
            <Mark className="h-5 w-5" />
            Silk Knot
          </p>
          <p className="mt-4 max-w-xs text-sm leading-6 text-paper/70">
            Body care, bath, wellness, and aromatherapy for everyday rituals.
          </p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="eyebrow text-paper/50">{column.title}</p>
            <ul className="mt-5 space-y-3 text-sm">
              {column.links.map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-paper/85 transition-opacity hover:opacity-60"
                    {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 border-t border-white/10 px-5 py-6 text-[11px] uppercase tracking-[0.16em] text-paper/55 md:flex-row md:items-center md:justify-between md:px-10">
        <p>© {new Date().getFullYear()} Silk Knot</p>
        <div className="flex gap-5">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/shipping">Shipping</Link>
        </div>
      </div>
    </footer>
  );
}
