import Link from "next/link";
import {
  Award,
  Bath,
  BookOpen,
  Droplets,
  FileText,
  Flame,
  HelpCircle,
  Leaf,
  Mail,
  Newspaper,
  Shield,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Mark } from "@/components/ui";

type FooterLink = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Body Care", href: "/shop?category=body-care", icon: Droplets },
      { label: "Bath", href: "/shop?type=Bath%20Salts,Sugar%20Scrub,Whipped%20Soap", icon: Bath },
      { label: "Soap", href: "/shop?category=bath-soap", icon: Sparkles },
      { label: "Candles", href: "/shop?category=aromatherapy", icon: Flame },
      { label: "Lifestyle", href: "/shop?category=lifestyle", icon: Leaf },
      { label: "Best Sellers", href: "/shop?bestseller=1", icon: Award },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Contact", href: "/contact", icon: Mail },
      { label: "Shipping", href: "/shipping", icon: Truck },
      { label: "FAQ", href: "/faq", icon: HelpCircle },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Our Story", href: "/about", icon: BookOpen },
      { label: "Ingredients", href: "/ingredients", icon: Leaf },
      { label: "Journal", href: "/journal", icon: Newspaper },
    ],
  },
  {
    title: "Social",
    // Lucide has no brand logos for Instagram / Facebook / Pinterest.
    links: [
      { label: "Instagram", href: "https://www.instagram.com" },
      { label: "Facebook", href: "https://www.facebook.com" },
      { label: "Pinterest", href: "https://www.pinterest.com" },
    ],
  },
];

const legalLinks: FooterLink[] = [
  { label: "Privacy", href: "/privacy", icon: Shield },
  { label: "Terms", href: "/terms", icon: FileText },
  { label: "Shipping", href: "/shipping", icon: Truck },
];

function FooterNavLink({ label, href, icon: Icon }: FooterLink) {
  const external = href.startsWith("http");
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-paper/85 transition-opacity hover:opacity-60"
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {Icon ? <Icon size={14} strokeWidth={1.6} className="shrink-0 opacity-70" aria-hidden /> : null}
      {label}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-x-6 gap-y-8 px-5 py-12 md:grid-cols-[1.3fr_repeat(4,1fr)] md:gap-12 md:px-10 md:py-24">
        <div className="col-span-2 md:col-span-1">
          <p className="inline-flex items-center gap-2 font-serif text-3xl">
            <Mark className="h-5 w-5" />
            Silken Knot
          </p>
          <p className="mt-4 max-w-xs text-sm leading-6 text-paper/70">
            Body care, bath, wellness, and aromatherapy for everyday rituals.
          </p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="eyebrow text-paper/50">{column.title}</p>
            <ul className="mt-3 space-y-2 text-sm md:mt-5 md:space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <FooterNavLink {...link} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 border-t border-white/10 px-5 py-6 text-[11px] uppercase tracking-[0.16em] text-paper/55 md:flex-row md:items-center md:justify-between md:px-10">
        <p>© {new Date().getFullYear()} Silken Knot</p>
        <div className="flex flex-wrap gap-5">
          {legalLinks.map((link) => (
            <FooterNavLink key={link.label} {...link} />
          ))}
        </div>
      </div>
    </footer>
  );
}
