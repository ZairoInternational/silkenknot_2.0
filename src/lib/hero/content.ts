export const HERO_CONTENT_ID = "homepage-hero";

/** Campaign / sale slide on the homepage hero. Evergreen product slides stay in code. */
export type HeroOffer = {
  enabled: boolean;
  pill: string;
  titleLine1: string;
  titleLine2: string;
  note: string;
  cta: string;
  href: string;
  secondaryCta: string;
  secondaryHref: string;
  image: string;
  alt: string;
  cardTag: string;
  cardName: string;
  chips: string[];
  couponCode: string;
  /** Short phrase repeated on the rotating seal, e.g. "DIWALI GLOW SALE" */
  sealLabel: string;
  /** Center of the seal, e.g. "25%" */
  sealPercent: string;
};

export const DEFAULT_HERO_OFFER: HeroOffer = {
  enabled: true,
  pill: "Diwali glow sale",
  titleLine1: "Glow brighter",
  titleLine2: "this Diwali.",
  note: "Up to 25% off selected body care, bath, and candles.",
  cta: "Shop the sale",
  href: "/shop",
  secondaryCta: "See best sellers",
  secondaryHref: "/shop?bestseller=1",
  image: "/silknknot/new_updates/all_combined.png",
  alt: "Silken Knot body butter with marigolds and diyas",
  cardTag: "Sale edit",
  cardName: "Diwali glow",
  chips: ["25% off", "DIWALI20"],
  couponCode: "DIWALI20",
  sealLabel: "DIWALI GLOW SALE",
  sealPercent: "25%",
};

function asString(value: unknown, fallback: string, max = 200) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

function asChips(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const chips = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 6)
    .map((chip) => chip.slice(0, 40));
  return chips.length ? chips : fallback;
}

function asHref(value: unknown, fallback: string) {
  const href = asString(value, fallback, 300);
  if (href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://")) return href;
  return fallback;
}

export function normalizeHeroOffer(input: unknown): HeroOffer {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const base = DEFAULT_HERO_OFFER;
  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : base.enabled,
    pill: asString(raw.pill, base.pill, 80),
    titleLine1: asString(raw.titleLine1, base.titleLine1, 80),
    titleLine2: asString(raw.titleLine2, base.titleLine2, 80),
    note: asString(raw.note, base.note, 280),
    cta: asString(raw.cta, base.cta, 60),
    href: asHref(raw.href, base.href),
    secondaryCta: asString(raw.secondaryCta, base.secondaryCta, 60),
    secondaryHref: asHref(raw.secondaryHref, base.secondaryHref),
    image: asString(raw.image, base.image, 500),
    alt: asString(raw.alt, base.alt, 160),
    cardTag: asString(raw.cardTag, base.cardTag, 40),
    cardName: asString(raw.cardName, base.cardName, 60),
    chips: asChips(raw.chips, base.chips),
    couponCode: asString(raw.couponCode, base.couponCode, 40).toUpperCase(),
    sealLabel: asString(raw.sealLabel, base.sealLabel, 60).toUpperCase(),
    sealPercent: asString(raw.sealPercent, base.sealPercent, 12),
  };
}
