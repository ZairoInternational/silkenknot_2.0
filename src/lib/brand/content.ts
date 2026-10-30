export const BRAND_CONTENT_ID = "site-brand";

export const BRAND_PLACEMENTS = [
  "header",
  "footer",
  "checkout",
  "auth",
  "welcome",
] as const;

export type BrandPlacementId = (typeof BRAND_PLACEMENTS)[number];

export type BrandAlign = "left" | "center" | "right";
export type BrandSpacing = "compact" | "default" | "relaxed";

export type BrandPlacementSettings = {
  /** Logo height in pixels. */
  height: number;
  /** Cap width so wide wordmarks do not blow out the layout. */
  maxWidth: number;
  /** Show “Silken Knot” (or icon alt) next to the mark. */
  showWordmark: boolean;
  /** Lighten the mark for dark surfaces (footer, dark auth panels). */
  lightOnDark: boolean;
  /** Horizontal alignment inside the placement slot. */
  align: BrandAlign;
  /** Gap between mark and brand name. */
  spacing: BrandSpacing;
  /**
   * Optional logo override for this surface only.
   * When empty / omitted, the global brand iconUrl is used.
   */
  iconUrl?: string;
};

export type BrandSettings = {
  /** Public URL for the Silken Knot mark used across the store. */
  iconUrl: string;
  iconAlt: string;
  placements: Record<BrandPlacementId, BrandPlacementSettings>;
};

export const BRAND_PLACEMENT_META: Record<
  BrandPlacementId,
  { title: string; hint: string; surface: "light" | "dark" | "mixed" }
> = {
  header: {
    title: "Site header",
    hint: "Top navigation on every storefront page.",
    surface: "light",
  },
  footer: {
    title: "Footer",
    hint: "Light footer brand block at the bottom of the shop.",
    surface: "light",
  },
  checkout: {
    title: "Checkout",
    hint: "Checkout header next to shop navigation.",
    surface: "light",
  },
  auth: {
    title: "Sign-in",
    hint: "Login and OTP screens.",
    surface: "mixed",
  },
  welcome: {
    title: "Welcome offer",
    hint: "Scratch-card welcome modal for new visitors.",
    surface: "light",
  },
};

export const DEFAULT_BRAND_PLACEMENTS: Record<BrandPlacementId, BrandPlacementSettings> = {
  header: { height: 56, maxWidth: 180, showWordmark: false, lightOnDark: false, align: "center", spacing: "default" },
  footer: { height: 32, maxWidth: 120, showWordmark: true, lightOnDark: false, align: "left", spacing: "default" },
  checkout: { height: 28, maxWidth: 120, showWordmark: true, lightOnDark: false, align: "left", spacing: "default" },
  auth: { height: 24, maxWidth: 96, showWordmark: true, lightOnDark: false, align: "left", spacing: "default" },
  welcome: { height: 40, maxWidth: 112, showWordmark: false, lightOnDark: false, align: "center", spacing: "default" },
};

/** Quick size chips for Studio — maps to height (and a sensible max width). */
export const BRAND_SIZE_PRESETS = [
  { id: "s", label: "S", height: 28, maxWidth: 96 },
  { id: "m", label: "M", height: 56, maxWidth: 180 },
  { id: "l", label: "L", height: 72, maxWidth: 220 },
  { id: "xl", label: "XL", height: 88, maxWidth: 260 },
] as const;

export const BRAND_ALIGN_OPTIONS: { id: BrandAlign; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

export const BRAND_SPACING_OPTIONS: { id: BrandSpacing; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "default", label: "Default" },
  { id: "relaxed", label: "Relaxed" },
];

/** Canonical storefront mark (also served as `/favicon.ico` via `src/app/favicon.ico`). */
export const DEFAULT_BRAND_ICON_URL = "/favicon.ico";

/** Retired temp mark — never serve this as the logo. */
const RETIRED_TEMP_LOGO = "/silknknot/logo.png";

export const DEFAULT_BRAND: BrandSettings = {
  iconUrl: DEFAULT_BRAND_ICON_URL,
  iconAlt: "Silken Knot",
  placements: DEFAULT_BRAND_PLACEMENTS,
};

function asString(value: unknown, fallback: string, max = 500) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

/** Map retired temp logo paths to the real brand mark. */
export function resolveBrandIconUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed === RETIRED_TEMP_LOGO || trimmed.endsWith("/silknknot/logo.png")) {
    return DEFAULT_BRAND_ICON_URL;
  }
  return trimmed;
}

function asIconUrl(value: unknown, fallback: string) {
  const url = asString(value, fallback, 800);
  if (
    url.startsWith("/") ||
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("data:")
  ) {
    return resolveBrandIconUrl(url);
  }
  return resolveBrandIconUrl(fallback);
}

function asInt(value: unknown, fallback: number, min: number, max: number) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function asBool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asAlign(value: unknown, fallback: BrandAlign): BrandAlign {
  return value === "left" || value === "center" || value === "right" ? value : fallback;
}

function asSpacing(value: unknown, fallback: BrandSpacing): BrandSpacing {
  return value === "compact" || value === "default" || value === "relaxed" ? value : fallback;
}

function asOptionalIconUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:")
  ) {
    return resolveBrandIconUrl(trimmed.slice(0, 800));
  }
  return undefined;
}

function normalizePlacement(input: unknown, fallback: BrandPlacementSettings): BrandPlacementSettings {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const iconUrl = asOptionalIconUrl(raw.iconUrl) ?? asOptionalIconUrl(fallback.iconUrl);
  return {
    height: asInt(raw.height, fallback.height, 12, 120),
    maxWidth: asInt(raw.maxWidth, fallback.maxWidth, 24, 320),
    showWordmark: asBool(raw.showWordmark, fallback.showWordmark),
    lightOnDark: asBool(raw.lightOnDark, fallback.lightOnDark),
    align: asAlign(raw.align, fallback.align),
    spacing: asSpacing(raw.spacing, fallback.spacing),
    ...(iconUrl ? { iconUrl } : {}),
  };
}

export function getBrandPlacement(
  brand: BrandSettings,
  placement: BrandPlacementId,
): BrandPlacementSettings {
  return brand.placements?.[placement] ?? DEFAULT_BRAND_PLACEMENTS[placement];
}

/** Effective logo URL for a surface (placement override, else global). */
export function getBrandPlacementIcon(brand: BrandSettings, placement: BrandPlacementId): string {
  const spot = getBrandPlacement(brand, placement);
  const custom = spot.iconUrl?.trim();
  if (custom) return resolveBrandIconUrl(custom);
  return resolveBrandIconUrl(brand.iconUrl || DEFAULT_BRAND.iconUrl);
}

export function normalizeBrandSettings(input: unknown): BrandSettings {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const base = DEFAULT_BRAND;
  const rawPlacements =
    raw.placements && typeof raw.placements === "object"
      ? (raw.placements as Record<string, unknown>)
      : {};

  const placements = {} as Record<BrandPlacementId, BrandPlacementSettings>;
  for (const id of BRAND_PLACEMENTS) {
    placements[id] = normalizePlacement(rawPlacements[id], base.placements[id]);
  }

  return {
    iconUrl: asIconUrl(raw.iconUrl, base.iconUrl),
    iconAlt: asString(raw.iconAlt, base.iconAlt, 120),
    placements,
  };
}
