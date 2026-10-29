/**
 * Canonical site origin for metadata, sitemap, robots, and JSON-LD.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL (preferred) or SITE_URL — set this to your custom domain
 * 2. Vercel production host (VERCEL_PROJECT_PRODUCTION_URL)
 * 3. Current Vercel deployment host (VERCEL_URL) — preview/branch URLs
 * 4. http://localhost:3000 in local/dev
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

function originFromHost(host: string | undefined) {
  const raw = host?.trim();
  if (!raw) return null;
  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  const origin = trimOrigin(withProtocol);
  return isHttpOrigin(origin) ? origin : null;
}

/** True when an explicit site URL env is set (custom domain or fixed origin). */
export function hasConfiguredSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  return Boolean(raw && isHttpOrigin(trimOrigin(raw)));
}

/**
 * Index production (and non-Vercel) hosts.
 * Vercel preview/development URLs and local `next dev` must not compete in Google.
 */
export function isIndexableDeployment() {
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  if (vercelEnv === "preview" || vercelEnv === "development") return false;
  if (process.env.NODE_ENV === "development") return false;
  return true;
}

/**
 * Absolute site origin for canonicals, OG, sitemap, and robots.
 */
export function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  if (configured) {
    const origin = trimOrigin(configured);
    if (isHttpOrigin(origin)) return origin;
  }

  const vercelProduction = originFromHost(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelProduction && process.env.VERCEL_ENV === "production") return vercelProduction;

  const vercelDeployment = originFromHost(process.env.VERCEL_URL);
  if (vercelDeployment) return vercelDeployment;

  if (process.env.NODE_ENV === "production" && !getSiteOrigin.warned) {
    getSiteOrigin.warned = true;
    console.warn(
      "[seo] NEXT_PUBLIC_SITE_URL is unset. On Vercel, set it to your custom domain when ready; until then production uses VERCEL_PROJECT_PRODUCTION_URL when available.",
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
