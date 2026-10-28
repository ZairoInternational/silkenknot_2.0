import Link from "next/link";
import {
  Award,
  Bath,
  BookOpen,
  Droplets,
  Flame,
  HelpCircle,
  Leaf,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Mark } from "@/components/ui";

type FooterLink = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

/** Update when the brand Instagram handle is ready. */
const INSTAGRAM_HREF = "https://www.instagram.com/silkenknot_/";

const CONTACT = {
  address: "117/N/70 3rd Floor, Kakadeo, Kanpur, India",
  email: "care@silkenknot.com",
  phoneDisplay: "(+91) 95980 23492",
  phoneHref: "+919598023492",
} as const;

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
      { label: "Contact & grievance", href: "/contact", icon: Mail },
      { label: "FAQ", href: "/faq", icon: HelpCircle },
      { label: "Journal", href: "/journal", icon: BookOpen },
      { label: "Ingredients", href: "/ingredients", icon: Leaf },
      { label: "Our Story", href: "/about", icon: BookOpen },
    ],
  },
];

const legalLinks: FooterLink[] = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Shipping", href: "/shipping" },
  { label: "Returns", href: "/returns" },
  { label: "Payments", href: "/payments" },
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
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-x-6 gap-y-8 px-5 py-10 md:grid-cols-[1.3fr_1fr_1fr_1.2fr] md:gap-10 md:px-10 md:py-14">
        <div className="col-span-2 md:col-span-1">
          <p className="inline-flex items-center gap-2 font-serif text-3xl">
            <Mark className="h-8 w-15" />
            Silken Knot
          </p>
          <p className="mt-4 max-w-xs text-sm leading-6 text-paper/70">
            Body care, bath, wellness, and aromatherapy for everyday rituals.
          </p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="eyebrow text-paper/50">{column.title}</p>
            <ul className="mt-3 space-y-2 text-sm md:mt-4 md:space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <FooterNavLink {...link} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="col-span-2 md:col-span-1" aria-label="Contact us">
          <p className="eyebrow text-paper/50">Contact us</p>
          <ul className="mt-3 space-y-3 text-sm text-paper/85 md:mt-4">
            <li className="flex items-start gap-2">
              <MapPin size={14} strokeWidth={1.6} className="mt-0.5 shrink-0 opacity-70" aria-hidden />
              <span className="leading-6">{CONTACT.address}</span>
            </li>
            <li>
              <a
                href={`mailto:${CONTACT.email}`}
                className="inline-flex items-center gap-2 transition-opacity hover:opacity-60"
              >
                <Mail size={14} strokeWidth={1.6} className="shrink-0 opacity-70" aria-hidden />
                {CONTACT.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${CONTACT.phoneHref}`}
                className="inline-flex items-center gap-2 transition-opacity hover:opacity-60"
              >
                <Phone size={14} strokeWidth={1.6} className="shrink-0 opacity-70" aria-hidden />
                {CONTACT.phoneDisplay}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-4 border-t border-white/10 px-5 py-5 text-[11px] uppercase tracking-[0.16em] text-paper/55 md:flex-row md:justify-between md:px-10">
        <p>© {new Date().getFullYear()} Silken Knot</p>
        <Link
          href={INSTAGRAM_HREF}
          target="_blank"
          rel="noreferrer"
          aria-label="Silken Knot on Instagram"
          className="inline-flex items-center justify-center transition-opacity hover:opacity-70"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/silknknot/instagram_icon.webp"
            alt="Instagram icon"
            width={24}
            height={24}
            className=" object-contain"
          />
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-5" aria-label="Policies">
          {legalLinks.map((link) => (
            <FooterNavLink key={link.label} {...link} />
          ))}
        </nav>
      </div>
    </footer>
  );
}
