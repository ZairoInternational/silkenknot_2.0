/**
 * Canonical site origin for metadata, sitemap, robots, and JSON-LD.
 *
 * Set NEXT_PUBLIC_SITE_URL (preferred) or SITE_URL to the production HTTPS origin
 * with no trailing slash, e.g. https://www.example.com
 */

const LOCAL_DEV_ORIGIN = "http://localhost:3000";

function trimOrigin(raw: string) {
  return raw.trim().replace(/\/+$/, "");
}

function isHttpOrigin(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** True when an absolute production-style site URL is configured. */
export function hasConfiguredSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  return Boolean(raw && isHttpOrigin(trimOrigin(raw)));
}

/**
 * Absolute site origin. Prefers NEXT_PUBLIC_SITE_URL, then SITE_URL.
 * Falls back to localhost in development so local metadata/OG still resolve.
 * In production without env, falls back to localhost and logs once — set the env.
 */
export function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  if (raw) {
    const origin = trimOrigin(raw);
    if (isHttpOrigin(origin)) return origin;
  }
  if (process.env.NODE_ENV === "production" && !getSiteOrigin.warned) {
    getSiteOrigin.warned = true;
    console.warn(
      "[seo] NEXT_PUBLIC_SITE_URL (or SITE_URL) is unset. Canonical URLs will use http://localhost:3000 until configured.",
    );
  }
  return LOCAL_DEV_ORIGIN;
}
getSiteOrigin.warned = false;

/** Build an absolute URL from a path (leading slash optional). */
export function absoluteUrl(path = "/") {
  const origin = getSiteOrigin();
  if (!path || path === "/") return `${origin}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}

/** Resolve a possibly relative asset URL against the site origin. */
export function absoluteAssetUrl(src: string | undefined | null): string | undefined {
  if (!src) return undefined;
  const trimmed = src.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return absoluteUrl(trimmed);
  return undefined;
}
