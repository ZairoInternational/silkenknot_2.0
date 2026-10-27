export const BRAND_CONTENT_ID = "site-brand";

export type BrandSettings = {
  /** Public URL for the Silken Knot mark used in header, footer, checkout, auth, etc. */
  iconUrl: string;
  iconAlt: string;
};

export const DEFAULT_BRAND: BrandSettings = {
  iconUrl: "/silknknot/logo.png",
  iconAlt: "Silken Knot",
};

function asString(value: unknown, fallback: string, max = 500) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

function asIconUrl(value: unknown, fallback: string) {
  const url = asString(value, fallback, 800);
  if (
    url.startsWith("/") ||
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  return fallback;
}

export function normalizeBrandSettings(input: unknown): BrandSettings {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const base = DEFAULT_BRAND;
  return {
    iconUrl: asIconUrl(raw.iconUrl, base.iconUrl),
    iconAlt: asString(raw.iconAlt, base.iconAlt, 120),
  };
}
