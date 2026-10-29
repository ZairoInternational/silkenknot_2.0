import type { Metadata } from "next";
import { absoluteAssetUrl, absoluteUrl, getSiteOrigin, isIndexableDeployment } from "@/lib/seo/site";

export const SITE_NAME = "Silken Knot";
export const DEFAULT_DESCRIPTION =
  "Body care, bath essentials, aromatherapy, and quiet apparel. Everyday rituals, made better.";

const NOINDEX: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

const INDEX: Metadata["robots"] = {
  index: true,
  follow: true,
};

/** Truncate meta descriptions without cutting mid-word when possible. */
export function truncateMeta(text: string, max = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const sliced = clean.slice(0, max - 1);
  const boundary = sliced.lastIndexOf(" ");
  return `${(boundary > 40 ? sliced.slice(0, boundary) : sliced).trimEnd()}…`;
}

export function noIndexRobots(): Metadata["robots"] {
  return NOINDEX;
}

type PageMetaInput = {
  title: string;
  description?: string;
  /** Path only, e.g. /shop — used for canonical + og:url */
  path: string;
  image?: string | null;
  index?: boolean;
  /** Override openGraph type */
  ogType?: "website" | "article" | "product";
};

export function buildPageMetadata(input: PageMetaInput): Metadata {
  const description = truncateMeta(input.description?.trim() || DEFAULT_DESCRIPTION);
  const canonical = absoluteUrl(input.path);
  const image = absoluteAssetUrl(input.image ?? undefined);
  const indexable = input.index !== false && isIndexableDeployment();

  return {
    title: input.title,
    description,
    alternates: { canonical },
    robots: indexable ? INDEX : NOINDEX,
    openGraph: {
      type: input.ogType === "article" ? "article" : "website",
      locale: "en_IN",
      siteName: SITE_NAME,
      title: input.title,
      description,
      url: canonical,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: input.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

/** Root layout metadata shared across the storefront. */
export function buildRootMetadata(input: { iconUrl: string }): Metadata {
  const origin = getSiteOrigin();
  const verificationToken = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const indexable = isIndexableDeployment();
  return {
    metadataBase: new URL(origin),
    title: {
      default: `${SITE_NAME} — Body care, bath & wellness`,
      template: `%s · ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    applicationName: SITE_NAME,
    icons: {
      icon: [{ url: input.iconUrl }],
      apple: [{ url: input.iconUrl }],
    },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: SITE_NAME,
      title: `${SITE_NAME} — Body care, bath & wellness`,
      description: DEFAULT_DESCRIPTION,
      url: absoluteUrl("/"),
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — Body care, bath & wellness`,
      description: DEFAULT_DESCRIPTION,
    },
    robots: indexable ? INDEX : NOINDEX,
    ...(verificationToken
      ? { verification: { google: verificationToken } }
      : {}),
  };
}

/**
 * Shop URL indexing rules:
 * - Bare /shop and single category filter: indexable, self-canonical
 * - Search, sort, price, rating, pagination, multi-filters: noindex, canonical to /shop or category
 */
export function shopMetadataFromSearchParams(params: Record<string, string | string[] | undefined>): Metadata {
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const category = get("category")?.trim() || "";
  const q = get("q")?.trim() || "";
  const sort = get("sort")?.trim() || "";
  const page = Number(get("page") || "1") || 1;
  const bestseller = get("bestseller");
  const type = get("type")?.trim() || "";
  const min = get("min");
  const max = get("max");
  const rating = get("rating");

  const noisy =
    Boolean(q) ||
    Boolean(sort && sort !== "featured") ||
    page > 1 ||
    Boolean(type) ||
    Boolean(min) ||
    Boolean(max) ||
    Boolean(rating) ||
    bestseller === "1" ||
    bestseller === "true";

  const categoryLabels: Record<string, string> = {
    "body-care": "Body Care",
    "bath-soap": "Bath & Soap",
    aromatherapy: "Aromatherapy",
    lifestyle: "Lifestyle",
  };

  const categoryLabel = category ? categoryLabels[category] : undefined;
  const preferredPath = category && categoryLabel && !noisy ? `/shop?category=${encodeURIComponent(category)}` : "/shop";

  const title = categoryLabel ? `${categoryLabel}` : "Shop";
  const description = categoryLabel
    ? `Shop Silken Knot ${categoryLabel.toLowerCase()} — body care, bath, and wellness made for everyday rituals.`
    : "Shop Silken Knot body care, bath essentials, aromatherapy, and quiet apparel.";

  return buildPageMetadata({
    title,
    description,
    path: preferredPath,
    index: !noisy && (!category || Boolean(categoryLabel)),
  });
}
