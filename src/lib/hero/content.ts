export const HERO_CONTENT_ID = "homepage-hero";

/** Campaign / sale slide on the homepage hero. */
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

/** Evergreen product slides (editable in Admin → Hero). */
export type HeroEvergreenSlide = {
  id: string;
  label: string;
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
};

export type HeroContent = {
  offer: HeroOffer;
  evergreen: HeroEvergreenSlide[];
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

export const DEFAULT_HERO_EVERGREEN: HeroEvergreenSlide[] = [
  {
    id: "butter",
    label: "Body butter",
    pill: "Body butter",
    titleLine1: "A butter that",
    titleLine2: "melts on warm skin.",
    note: "Shea and murumuru for the hour after bathing, with a finish that lets you dress.",
    cta: "Shop body butter",
    href: "/shop?category=body-care",
    secondaryCta: "Browse everything",
    secondaryHref: "/shop",
    image: "/silknknot/new_updates/body_butter.png",
    alt: "Silken Knot body butter jar",
    cardTag: "Body care",
    cardName: "Body butter",
    chips: ["Shea", "Murumuru"],
  },
  {
    id: "scrub",
    label: "Sugar scrub",
    pill: "Sugar scrub",
    titleLine1: "A polish for",
    titleLine2: "arms, legs, and shoulders.",
    note: "The grains soften as you massage, so skin feels smooth rather than stripped.",
    cta: "Shop sugar scrub",
    href: "/shop?category=body-care",
    secondaryCta: "Browse everything",
    secondaryHref: "/shop",
    image: "/silknknot/new_updates/sugar_scrap.png",
    alt: "Silken Knot sugar scrub",
    cardTag: "Body care",
    cardName: "Sugar scrub",
    chips: ["Soft grains", "Smooth finish"],
  },
  {
    id: "salts",
    label: "Bath salts",
    pill: "Bath salts",
    titleLine1: "Minerals for",
    titleLine2: "the soak itself.",
    note: "Pour them in before the butter. The bath is the first step, not a scent in the room.",
    cta: "Shop bath salts",
    href: "/shop?category=bath-soap",
    secondaryCta: "Browse everything",
    secondaryHref: "/shop",
    image: "/silknknot/new_updates/bath-salts.jfif",
    alt: "Silken Knot bath salts",
    cardTag: "Bath",
    cardName: "Bath salts",
    chips: ["Mineral soak"],
  },
];

export const DEFAULT_HERO_CONTENT: HeroContent = {
  offer: DEFAULT_HERO_OFFER,
  evergreen: DEFAULT_HERO_EVERGREEN,
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

export function normalizeHeroEvergreenSlide(input: unknown, fallback: HeroEvergreenSlide): HeroEvergreenSlide {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    id: asString(raw.id, fallback.id, 40),
    label: asString(raw.label, fallback.label, 80),
    pill: asString(raw.pill, fallback.pill, 80),
    titleLine1: asString(raw.titleLine1, fallback.titleLine1, 80),
    titleLine2: asString(raw.titleLine2, fallback.titleLine2, 80),
    note: asString(raw.note, fallback.note, 280),
    cta: asString(raw.cta, fallback.cta, 60),
    href: asHref(raw.href, fallback.href),
    secondaryCta: asString(raw.secondaryCta, fallback.secondaryCta, 60),
    secondaryHref: asHref(raw.secondaryHref, fallback.secondaryHref),
    image: asString(raw.image, fallback.image, 500),
    alt: asString(raw.alt, fallback.alt, 160),
    cardTag: asString(raw.cardTag, fallback.cardTag, 40),
    cardName: asString(raw.cardName, fallback.cardName, 60),
    chips: asChips(raw.chips, fallback.chips),
  };
}

export function normalizeHeroEvergreen(input: unknown): HeroEvergreenSlide[] {
  if (!Array.isArray(input) || !input.length) return DEFAULT_HERO_EVERGREEN;
  return DEFAULT_HERO_EVERGREEN.map((fallback, index) =>
    normalizeHeroEvergreenSlide(input[index] ?? input.find((row) => {
      const id = row && typeof row === "object" ? (row as { id?: unknown }).id : undefined;
      return id === fallback.id;
    }), fallback),
  );
}

export function normalizeHeroContent(input: unknown): HeroContent {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  // Legacy documents stored only `offer` at the root of the content row.
  const offerSource = raw.offer ?? (raw.enabled !== undefined || raw.image !== undefined ? raw : undefined);
  return {
    offer: normalizeHeroOffer(offerSource),
    evergreen: normalizeHeroEvergreen(raw.evergreen),
  };
}
