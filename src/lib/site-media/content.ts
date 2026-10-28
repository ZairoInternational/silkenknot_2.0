export const SITE_MEDIA_CONTENT_ID = "site-media";

/** Marketing / UI images that are not product galleries. */
export type SiteMediaSettings = {
  collectionBodyCare: string;
  collectionBathSoap: string;
  collectionAromatherapy: string;
  collectionLifestyle: string;
  collectionLifestyleWide: string;
  bestsellerButter: string;
  bestsellerSoap: string;
  bestsellerCandle: string;
  whySilkKnot: string;
  brandStory: string;
  shopHero: string;
  shopEditorial: string;
  authBackground: string;
  checkoutBanner: string;
  wishlistBanner: string;
  newsletterBackground: string;
  categoryStrip: SiteMediaStripItem[];
  reviews: SiteMediaReview[];
};

export type SiteMediaStripItem = {
  id: string;
  name: string;
  href: string;
  image: string;
};

export type SiteMediaReview = {
  id: string;
  name: string;
  city: string;
  rating: number;
  text: string;
  productId: string;
  productName: string;
  /** Fallback when the product has no gallery image yet. */
  image: string;
};

export const DEFAULT_SITE_MEDIA: SiteMediaSettings = {
  collectionBodyCare: "/silknknot/collection-body-care.jpg",
  collectionBathSoap: "/silknknot/collection-bath-soap.jpg",
  collectionAromatherapy: "/silknknot/collection-aromatherapy.jpg",
  collectionLifestyle: "/silknknot/collection-lifestyle.jpg",
  collectionLifestyleWide: "/silknknot/collection-lifestyle-wide.jpg",
  bestsellerButter: "/silknknot/bestseller-butter.jpg",
  bestsellerSoap: "/silknknot/bestseller-soap.jpg",
  bestsellerCandle: "/silknknot/bestseller-candle.jpg",
  whySilkKnot: "/silknknot/collection-body-care.jpg",
  brandStory: "/silknknot/bestseller-candle.jpg",
  shopHero: "/silknknot/collection-body-care.jpg",
  shopEditorial: "/silknknot/collection-lifestyle-wide.jpg",
  authBackground: "/silknknot/collection-lifestyle-wide.jpg",
  checkoutBanner: "/silknknot/collection-lifestyle-wide.jpg",
  wishlistBanner: "/silknknot/hero-butter-right.jpg",
  newsletterBackground: "/silknknot/collection-lifestyle-wide.jpg",
  categoryStrip: [
    { id: "body-butter", name: "Body Butter", href: "/shop?type=Body%20Butter", image: "/silknknot/body_butter.jpg" },
    { id: "whipped-soap", name: "Whipped Soap", href: "/shop?type=Whipped%20Soap", image: "/silknknot/whipped_shop.jpg" },
    { id: "sugar-scrub", name: "Sugar Scrub", href: "/shop?type=Sugar%20Scrub", image: "/silknknot/sugar_scrap1.jpg" },
    { id: "bath-salts", name: "Bath Salts", href: "/shop?type=Bath%20Salts", image: "/silknknot/bath_salts1.jpg" },
    { id: "soap", name: "Soap", href: "/shop?category=bath-soap", image: "/silknknot/soap1.webp" },
    { id: "candles", name: "Candles", href: "/shop?category=aromatherapy", image: "/silknknot/candle1.jpg" },
  ],
  reviews: [
    {
      id: "1",
      name: "Ananya R.",
      city: "Bengaluru",
      rating: 5,
      text: "The candle is absolutely beautiful. It fills my room with a calming fragrance and the packaging feels so premium.",
      productId: "studio-tin-candle",
      productName: "Studio Tin Candle",
      image: "/silknknot/candle2.webp",
    },
    {
      id: "2",
      name: "Priya S.",
      city: "Hyderabad",
      rating: 5,
      text: "My skin has never felt so soft and nourished. The fragrance is subtle yet so luxurious. Truly a self-care essential!",
      productId: "night-milk-body-butter",
      productName: "Night Milk Body Butter",
      image: "/silknknot/new_updates/body_butter.png",
    },
    {
      id: "3",
      name: "Meera K.",
      city: "Mumbai",
      rating: 5,
      text: "These bath salts are pure bliss! It turns my bath time into a spa experience. Love the natural ingredients.",
      productId: "mineral-bath-salts",
      productName: "Mineral Bath Salts",
      image: "/silknknot/new_updates/bath-salts.jfif",
    },
    {
      id: "4",
      name: "Ishita M.",
      city: "Pune",
      rating: 5,
      text: "Everything feels thoughtfully made. The texture, the presentation and the little details make my daily routine special.",
      productId: "atelier-milk-soap",
      productName: "Atelier Milk Soap",
      image: "/silknknot/soap1.webp",
    },
    {
      id: "5",
      name: "Rhea P.",
      city: "Chennai",
      rating: 5,
      text: "A beautiful addition to my evening routine. The product feels indulgent without being over the top.",
      productId: "palm-sugar-scrub",
      productName: "Palm Sugar Scrub",
      image: "/silknknot/sugar_scrap1.jpg",
    },
  ],
};

/** Admin form labels for single-image slots. */
export const SITE_MEDIA_SLOTS: { key: keyof Omit<SiteMediaSettings, "categoryStrip" | "reviews">; label: string; hint: string }[] = [
  { key: "collectionBodyCare", label: "Collection — Body Care", hint: "Header mega-menu, category section, shop preview" },
  { key: "collectionBathSoap", label: "Collection — Bath & Soap", hint: "Header mega-menu, category section" },
  { key: "collectionAromatherapy", label: "Collection — Aromatherapy", hint: "Header mega-menu" },
  { key: "collectionLifestyle", label: "Collection — Lifestyle", hint: "Header mega-menu, category section" },
  { key: "collectionLifestyleWide", label: "Lifestyle wide", hint: "Fallback wide banner" },
  { key: "bestsellerButter", label: "Bestseller — Butter", hint: "Shelf / explore cards" },
  { key: "bestsellerSoap", label: "Bestseller — Soap", hint: "Shelf / explore cards" },
  { key: "bestsellerCandle", label: "Bestseller — Candle", hint: "Shelf / explore / aromatherapy cards" },
  { key: "whySilkKnot", label: "Why Silken Knot", hint: "Homepage story block" },
  { key: "brandStory", label: "Brand story", hint: "Homepage “Our story” block" },
  { key: "shopHero", label: "Shop hero", hint: "Shop page top banner" },
  { key: "shopEditorial", label: "Shop editorial", hint: "Shop page lower banner" },
  { key: "authBackground", label: "Sign-in background", hint: "Login / OTP page" },
  { key: "checkoutBanner", label: "Checkout banner", hint: "Checkout header background" },
  { key: "wishlistBanner", label: "Wishlist banner", hint: "Wishlist page hero" },
  { key: "newsletterBackground", label: "Newsletter background", hint: "Homepage newsletter section" },
];

function asUrl(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, 800);
  if (!trimmed) return fallback;
  if (trimmed.startsWith("/") || trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  return fallback;
}

function asHref(value: unknown, fallback: string) {
  const href = asUrl(value, fallback);
  if (href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://")) return href;
  return fallback;
}

function asStrip(value: unknown): SiteMediaStripItem[] {
  if (!Array.isArray(value) || !value.length) return DEFAULT_SITE_MEDIA.categoryStrip;
  const items = value
    .map((row, index) => {
      const raw = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      const fallback = DEFAULT_SITE_MEDIA.categoryStrip[index] || DEFAULT_SITE_MEDIA.categoryStrip[0];
      const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 64) : fallback.id;
      return {
        id,
        name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 60) : fallback.name,
        href: asHref(raw.href, fallback.href),
        image: asUrl(raw.image, fallback.image),
      };
    })
    .slice(0, 12);
  return items.length ? items : DEFAULT_SITE_MEDIA.categoryStrip;
}

function asReviews(value: unknown): SiteMediaReview[] {
  if (!Array.isArray(value) || !value.length) return DEFAULT_SITE_MEDIA.reviews;
  const items = value
    .map((row, index) => {
      const raw = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      const fallback = DEFAULT_SITE_MEDIA.reviews[index] || DEFAULT_SITE_MEDIA.reviews[0];
      const ratingRaw = typeof raw.rating === "number" ? raw.rating : Number(raw.rating);
      const rating = Number.isFinite(ratingRaw) ? Math.min(5, Math.max(1, Math.round(ratingRaw))) : fallback.rating;
      return {
        id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 40) : fallback.id,
        name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 80) : fallback.name,
        city: typeof raw.city === "string" && raw.city.trim() ? raw.city.trim().slice(0, 80) : fallback.city,
        rating,
        text: typeof raw.text === "string" && raw.text.trim() ? raw.text.trim().slice(0, 600) : fallback.text,
        productId: typeof raw.productId === "string" ? raw.productId.trim().slice(0, 80) : fallback.productId,
        productName:
          typeof raw.productName === "string" && raw.productName.trim()
            ? raw.productName.trim().slice(0, 120)
            : fallback.productName,
        image: asUrl(raw.image, fallback.image),
      };
    })
    .slice(0, 12);
  return items.length ? items : DEFAULT_SITE_MEDIA.reviews;
}

export function normalizeSiteMedia(input: unknown): SiteMediaSettings {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const base = DEFAULT_SITE_MEDIA;
  return {
    collectionBodyCare: asUrl(raw.collectionBodyCare, base.collectionBodyCare),
    collectionBathSoap: asUrl(raw.collectionBathSoap, base.collectionBathSoap),
    collectionAromatherapy: asUrl(raw.collectionAromatherapy, base.collectionAromatherapy),
    collectionLifestyle: asUrl(raw.collectionLifestyle, base.collectionLifestyle),
    collectionLifestyleWide: asUrl(raw.collectionLifestyleWide, base.collectionLifestyleWide),
    bestsellerButter: asUrl(raw.bestsellerButter, base.bestsellerButter),
    bestsellerSoap: asUrl(raw.bestsellerSoap, base.bestsellerSoap),
    bestsellerCandle: asUrl(raw.bestsellerCandle, base.bestsellerCandle),
    whySilkKnot: asUrl(raw.whySilkKnot, base.whySilkKnot),
    brandStory: asUrl(raw.brandStory, base.brandStory),
    shopHero: asUrl(raw.shopHero, base.shopHero),
    shopEditorial: asUrl(raw.shopEditorial, base.shopEditorial),
    authBackground: asUrl(raw.authBackground, base.authBackground),
    checkoutBanner: asUrl(raw.checkoutBanner, base.checkoutBanner),
    wishlistBanner: asUrl(raw.wishlistBanner, base.wishlistBanner),
    newsletterBackground: asUrl(raw.newsletterBackground, base.newsletterBackground),
    categoryStrip: asStrip(raw.categoryStrip),
    reviews: asReviews(raw.reviews),
  };
}
