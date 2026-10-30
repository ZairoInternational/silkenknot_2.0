"use client";

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
import { BrandLogo } from "@/components/ui";

type FooterLink = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

/** Update when each brand profile URL is ready. */
const INSTAGRAM_HREF = "https://www.instagram.com/silkenknot_/";
const FACEBOOK_HREF = "";
const X_HREF = "";
const LINKEDIN_HREF = "";

const socialLinks = [
  {
    label: "Instagram",
    href: INSTAGRAM_HREF,
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/silknknot/instagram_icon.webp"
        alt=""
        width={24}
        height={24}
        className="object-contain"
      />
    ),
  },
  // {
  //   label: "Facebook",
  //   href: FACEBOOK_HREF,
  //   icon: (
  //           <img
  //       src="/silknknot/facebook_icon.avif"
  //       alt=""
  //       width={24}
  //       height={24}
  //       className="object-contain"
  //     />

  //   ),
  // },
  // {
  //   label: "X",
  //   href: X_HREF,
  //   icon: (
  //     <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden fill="currentColor">
  //       <path d="M17.7 3H20.5l-7.05 8.06L21.5 21h-5.9l-4.62-6.04L5.7 21H2.9l7.55-8.63L2.5 3h6.05l4.17 5.52L17.7 3Zm-1.04 16.2h1.64L7.43 4.7H5.67l11 14.5Z" />
  //     </svg>
  //   ),
  // },
  // {
  //   label: "LinkedIn",
  //   href: LINKEDIN_HREF,
  //   icon: (
  //     <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden fill="currentColor">
  //       <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3.5A1.97 1.97 0 1 0 5.26 7.44 1.97 1.97 0 0 0 5.25 3.5ZM20.44 20h-3.37v-5.6c0-1.34-.02-3.05-1.86-3.05-1.86 0-2.15 1.45-2.15 2.95V20H9.7V8.5h3.23v1.57h.05c.45-.85 1.55-1.75 3.19-1.75 3.41 0 4.04 2.25 4.04 5.17V20Z" />
  //     </svg>
  //   ),
  // },
] as const;

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
          <p className="font-serif text-3xl">
            <BrandLogo placement="footer" wordmarkClassName="font-serif text-3xl text-paper" />
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
        <p>
          © {new Date().getFullYear()} Silken Knot
          <sup className="ml-0.5 text-[0.7em] tracking-normal" aria-label="trademark">
            ™
          </sup>
        </p>
        <nav className="flex items-center gap-4" aria-label="Social">
          {socialLinks.map((item) => {
            const href = item.href.trim();
            return (
              <Link
                key={item.label}
                href={href || "#"}
                {...(href ? { target: "_blank", rel: "noreferrer" } : {})}
                aria-label={`Silken Knot on ${item.label}`}
                className="inline-flex size-6 items-center justify-center text-paper/85 transition-opacity hover:opacity-70"
              >
                {item.icon}
              </Link>
            );
          })}
        </nav>
        <nav className="flex flex-wrap items-center justify-center gap-5" aria-label="Policies">
          {legalLinks.map((link) => (
            <FooterNavLink key={link.label} {...link} />
          ))}
        </nav>
      </div>
    </footer>
  );
}
