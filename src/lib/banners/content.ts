/**
 * Banner & campaign content model, validation, and eligibility helpers.
 * Timezone for schedule UI and date-only boundaries: Asia/Kolkata (IST, UTC+5:30).
 */

export const BANNER_TIMEZONE = "Asia/Kolkata";
export const BANNER_PLACEMENTS = ["homepage-hero", "promotional-strip"] as const;
export const BANNER_STATUSES = ["draft", "scheduled", "published", "archived"] as const;

export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];
export type BannerStatus = (typeof BANNER_STATUSES)[number];

export type BannerCta = {
  enabled: boolean;
  label: string;
  href: string;
  openInNewTab: boolean;
};

export type BannerImage = {
  desktopUrl: string;
  mobileUrl: string;
  alt: string;
};

export type BannerRecord = {
  id: string;
  name: string;
  description: string;
  placement: BannerPlacement;
  image: BannerImage;
  title: string;
  subtitle: string;
  promotionalText: string;
  supportingText: string;
  cta: BannerCta;
  wholeBannerClickable: boolean;
  status: BannerStatus;
  /** ISO UTC instant — start of campaign window. */
  startsAt: string;
  /** ISO UTC instant — end of campaign window (inclusive). */
  endsAt: string;
  timezone: typeof BANNER_TIMEZONE;
  priority: number;
  categorySlug: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};

/** Fields safe to return from the public storefront API. */
export type PublicBanner = {
  id: string;
  placement: BannerPlacement;
  image: BannerImage;
  title: string;
  subtitle: string;
  promotionalText: string;
  supportingText: string;
  cta: BannerCta;
  wholeBannerClickable: boolean;
  priority: number;
  startsAt: string;
  endsAt: string;
};

export type BannerValidationError = { field?: string; message: string };

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function asString(value: unknown, fallback = "", max = 500) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

export function isBannerPlacement(value: unknown): value is BannerPlacement {
  return typeof value === "string" && (BANNER_PLACEMENTS as readonly string[]).includes(value);
}

export function isBannerStatus(value: unknown): value is BannerStatus {
  return typeof value === "string" && (BANNER_STATUSES as readonly string[]).includes(value);
}

/** Reject unsafe destinations; allow relative app paths and https URLs. */
export function validateBannerHref(raw: unknown): { ok: true; href: string } | { ok: false; message: string } {
  if (typeof raw !== "string") return { ok: false, message: "Destination URL is required." };
  const href = raw.trim();
  if (!href) return { ok: false, message: "Destination URL is required." };
  if (href.length > 500) return { ok: false, message: "Destination URL is too long." };
  const lower = href.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:") ||
    lower.startsWith("blob:")
  ) {
    return { ok: false, message: "That destination protocol is not allowed." };
  }
  if (href.startsWith("//")) {
    return { ok: false, message: "Protocol-relative URLs are not allowed." };
  }
  if (href.startsWith("/")) {
    if (href.startsWith("/\\") || href.includes("\\") || href.includes("://")) {
      return { ok: false, message: "That internal path is not allowed." };
    }
    return { ok: true, href };
  }
  try {
    const url = new URL(href);
    if (url.protocol === "https:") return { ok: true, href: url.toString() };
    if (url.protocol === "http:") {
      return { ok: false, message: "External links must use HTTPS." };
    }
    return { ok: false, message: "That destination protocol is not allowed." };
  } catch {
    return { ok: false, message: "Destination URL is not valid." };
  }
}

/**
 * Parse a date/time in Asia/Kolkata.
 * - Date-only `YYYY-MM-DD` start → 00:00:00.000 IST
 * - Date-only `YYYY-MM-DD` end → 23:59:59.999 IST
 * - Full ISO strings are accepted as absolute instants
 */
export function parseBannerInstant(
  raw: unknown,
  role: "start" | "end",
): { ok: true; iso: string } | { ok: false; message: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, message: role === "start" ? "Start date is required." : "End date is required." };
  }
  const value = raw.trim();

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { ok: false, message: "That date is not valid." };
    }
    // Build UTC millis for the IST wall-clock moment.
    const utcMs =
      Date.UTC(year, month - 1, day, role === "end" ? 23 : 0, role === "end" ? 59 : 0, role === "end" ? 59 : 0, role === "end" ? 999 : 0) -
      IST_OFFSET_MS;
    const date = new Date(utcMs);
    if (Number.isNaN(date.getTime())) return { ok: false, message: "That date is not valid." };
    // Guard against JS Date overflow (e.g. 2026-02-31)
    const check = new Date(utcMs + IST_OFFSET_MS);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
      return { ok: false, message: "That date is not valid." };
    }
    return { ok: true, iso: date.toISOString() };
  }

  // datetime-local without Z: treat as Asia/Kolkata wall time
  const local = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (local && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    const year = Number(local[1]);
    const month = Number(local[2]);
    const day = Number(local[3]);
    const hour = Number(local[4]);
    const minute = Number(local[5]);
    const second = Number(local[6] || "0");
    const utcMs = Date.UTC(year, month - 1, day, hour, minute, second, role === "end" && !local[6] ? 999 : 0) - IST_OFFSET_MS;
    const date = new Date(utcMs);
    if (Number.isNaN(date.getTime())) return { ok: false, message: "That date and time are not valid." };
    return { ok: true, iso: date.toISOString() };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { ok: false, message: "That date and time are not valid." };
  return { ok: true, iso: date.toISOString() };
}

export function validateDateRange(startsAt: string, endsAt: string): BannerValidationError | null {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return { message: "Campaign dates are invalid." };
  if (start >= end) return { message: "Start must be before the end date." };
  return null;
}

export function bannerHasRequiredImage(image: BannerImage) {
  return Boolean(image.desktopUrl?.trim());
}

/**
 * Public eligibility — timestamp-based; no cron required.
 * Draft/archived never eligible. Scheduled and published are eligible only inside [startsAt, endsAt].
 */
export function isBannerPubliclyEligible(banner: Pick<BannerRecord, "status" | "startsAt" | "endsAt" | "image">, now: Date = new Date()) {
  if (banner.status !== "published" && banner.status !== "scheduled") return false;
  if (!bannerHasRequiredImage(banner.image)) return false;
  const t = now.getTime();
  const start = Date.parse(banner.startsAt);
  const end = Date.parse(banner.endsAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return t >= start && t <= end;
}

/** Admin UI: currently active in the live window (independent of draft/archive). */
export function isBannerCurrentlyActive(banner: Pick<BannerRecord, "status" | "startsAt" | "endsAt" | "image">, now: Date = new Date()) {
  return isBannerPubliclyEligible(banner, now);
}

export function activityLabel(banner: Pick<BannerRecord, "status" | "startsAt" | "endsAt" | "image">, now: Date = new Date()) {
  if (banner.status === "draft") return "Draft — not live";
  if (banner.status === "archived") return "Archived — not live";
  if (!bannerHasRequiredImage(banner.image)) return "Missing desktop image — not live";
  const t = now.getTime();
  const start = Date.parse(banner.startsAt);
  const end = Date.parse(banner.endsAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return "Invalid schedule";
  if (t < start) return "Scheduled — not yet started";
  if (t > end) return "Expired — not live";
  if (banner.status === "scheduled" || banner.status === "published") return "Live now";
  return "Not live";
}

export function toPublicBanner(banner: BannerRecord): PublicBanner {
  const isHeroCampaign = banner.placement === "homepage-hero";
  const linkEnabled = Boolean(banner.cta.enabled && banner.cta.href);
  const publicBanner: PublicBanner = {
    id: banner.id,
    placement: banner.placement,
    image: {
      desktopUrl: banner.image.desktopUrl,
      mobileUrl: banner.image.mobileUrl || "",
      alt: banner.image.alt || banner.name || "Campaign banner",
    },
    title: isHeroCampaign ? "" : banner.title,
    subtitle: isHeroCampaign ? "" : banner.subtitle,
    promotionalText: isHeroCampaign ? "" : banner.promotionalText,
    supportingText: isHeroCampaign ? "" : banner.supportingText,
    cta: {
      enabled: linkEnabled,
      label: isHeroCampaign || !linkEnabled ? "" : banner.cta.label,
      href: linkEnabled ? banner.cta.href : "",
      openInNewTab: linkEnabled ? banner.cta.openInNewTab : false,
    },
    // Hero campaigns with a link are always whole-image clickable.
    wholeBannerClickable: isHeroCampaign
      ? linkEnabled
      : Boolean(banner.wholeBannerClickable && linkEnabled),
    priority: banner.priority,
    startsAt: banner.startsAt,
    endsAt: banner.endsAt,
  };
  return publicBanner;
}

export type BannerWriteInput = {
  name?: unknown;
  description?: unknown;
  placement?: unknown;
  image?: unknown;
  title?: unknown;
  subtitle?: unknown;
  promotionalText?: unknown;
  supportingText?: unknown;
  cta?: unknown;
  wholeBannerClickable?: unknown;
  status?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  priority?: unknown;
  categorySlug?: unknown;
};

export type NormalizeBannerOptions = {
  existing?: BannerRecord | null;
  /** When true, enforce publish-ready rules (desktop image, CTA fields). */
  requirePublishReady?: boolean;
  now?: Date;
};

function normalizeImage(raw: unknown, existing?: BannerImage): BannerImage {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const desktopUrl = asString(source.desktopUrl ?? existing?.desktopUrl, "", 800);
  const mobileUrl = asString(source.mobileUrl ?? existing?.mobileUrl, "", 800);
  const alt = asString(source.alt ?? existing?.alt, "", 160);
  return {
    desktopUrl,
    mobileUrl,
    alt: alt || "Campaign banner",
  };
}

function normalizeCta(
  raw: unknown,
  existing: BannerCta | undefined,
  mode: "button" | "optional-link",
): { cta: BannerCta; wholeBannerClickable: boolean; error?: BannerValidationError } {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  // Homepage hero campaigns: image-only with an optional destination (whole image clickable).
  if (mode === "optional-link") {
    const hrefRaw = source.href ?? existing?.href ?? "";
    const hrefValue = typeof hrefRaw === "string" ? hrefRaw.trim() : "";
    if (!hrefValue) {
      return {
        cta: { enabled: false, label: "", href: "", openInNewTab: false },
        wholeBannerClickable: false,
      };
    }
    const hrefCheck = validateBannerHref(hrefValue);
    if (!hrefCheck.ok) {
      return {
        cta: { enabled: false, label: "", href: "", openInNewTab: false },
        wholeBannerClickable: false,
        error: { field: "cta.href", message: hrefCheck.message },
      };
    }
    return {
      cta: {
        enabled: true,
        label: "",
        href: hrefCheck.href,
        openInNewTab: typeof source.openInNewTab === "boolean" ? source.openInNewTab : existing?.openInNewTab ?? false,
      },
      wholeBannerClickable: true,
    };
  }

  const enabled = typeof source.enabled === "boolean" ? source.enabled : existing?.enabled ?? false;
  if (!enabled) {
    return {
      cta: { enabled: false, label: "", href: "", openInNewTab: false },
      wholeBannerClickable: false,
    };
  }
  const label = asString(source.label ?? existing?.label, "", 60);
  const hrefCheck = validateBannerHref(source.href ?? existing?.href ?? "");
  if (!label) {
    return {
      cta: { enabled: true, label: "", href: "", openInNewTab: false },
      wholeBannerClickable: false,
      error: { field: "cta.label", message: "CTA label is required when the button is enabled." },
    };
  }
  if (!hrefCheck.ok) {
    return {
      cta: { enabled: true, label, href: "", openInNewTab: false },
      wholeBannerClickable: false,
      error: { field: "cta.href", message: hrefCheck.message },
    };
  }
  const wholeBannerClickable =
    typeof source.wholeBannerClickable === "boolean"
      ? source.wholeBannerClickable
      : false;
  return {
    cta: {
      enabled: true,
      label,
      href: hrefCheck.href,
      openInNewTab: typeof source.openInNewTab === "boolean" ? source.openInNewTab : existing?.openInNewTab ?? false,
    },
    wholeBannerClickable,
  };
}

/**
 * Normalize and validate a banner write payload.
 * Does not invent CDN URLs — empty image strings stay empty until upload.
 */
export function normalizeBannerWrite(
  input: BannerWriteInput,
  options: NormalizeBannerOptions = {},
): { ok: true; banner: Omit<BannerRecord, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"> & Partial<Pick<BannerRecord, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">> } | { ok: false; error: BannerValidationError } {
  const existing = options.existing || null;
  const name = asString(input.name ?? existing?.name, "", 120);
  if (!name) return { ok: false, error: { field: "name", message: "Campaign name is required." } };

  const placementRaw = input.placement ?? existing?.placement ?? "homepage-hero";
  if (!isBannerPlacement(placementRaw)) {
    return { ok: false, error: { field: "placement", message: "Choose a valid placement." } };
  }

  const statusRaw = input.status ?? existing?.status ?? "draft";
  if (!isBannerStatus(statusRaw)) {
    return { ok: false, error: { field: "status", message: "Choose a valid status." } };
  }

  const startParsed = parseBannerInstant(input.startsAt ?? existing?.startsAt, "start");
  if (!startParsed.ok) return { ok: false, error: { field: "startsAt", message: startParsed.message } };
  const endParsed = parseBannerInstant(input.endsAt ?? existing?.endsAt, "end");
  if (!endParsed.ok) return { ok: false, error: { field: "endsAt", message: endParsed.message } };
  const rangeError = validateDateRange(startParsed.iso, endParsed.iso);
  if (rangeError) return { ok: false, error: { field: "endsAt", message: rangeError.message } };

  const image = normalizeImage(input.image, existing?.image);
  const isHeroCampaign = placementRaw === "homepage-hero";
  const ctaInput =
    input.cta && typeof input.cta === "object"
      ? { ...(input.cta as Record<string, unknown>), wholeBannerClickable: input.wholeBannerClickable }
      : input.cta;
  const ctaResult = normalizeCta(ctaInput, existing?.cta, isHeroCampaign ? "optional-link" : "button");
  if (ctaResult.error) return { ok: false, error: ctaResult.error };

  const priorityRaw = input.priority ?? existing?.priority ?? 0;
  const priority = typeof priorityRaw === "number" && Number.isFinite(priorityRaw) ? Math.max(0, Math.min(10_000, Math.round(priorityRaw))) : 0;

  const wholeBannerClickable = isHeroCampaign
    ? ctaResult.wholeBannerClickable
    : Boolean(
        (typeof input.wholeBannerClickable === "boolean"
          ? input.wholeBannerClickable
          : existing?.wholeBannerClickable ?? false) && ctaResult.cta.enabled,
      ) || ctaResult.wholeBannerClickable;

  const publishReady = options.requirePublishReady || statusRaw === "published" || statusRaw === "scheduled";
  if (publishReady && !bannerHasRequiredImage(image)) {
    return { ok: false, error: { field: "image.desktopUrl", message: "A desktop banner image is required before scheduling or publishing." } };
  }

  return {
    ok: true,
    banner: {
      name,
      description: asString(input.description ?? existing?.description, "", 500),
      placement: placementRaw,
      image: {
        ...image,
        alt: image.alt || name,
      },
      // Hero campaigns are image-led; strip storefront copy fields.
      title: isHeroCampaign ? "" : asString(input.title ?? existing?.title, "", 120),
      subtitle: isHeroCampaign ? "" : asString(input.subtitle ?? existing?.subtitle, "", 160),
      promotionalText: isHeroCampaign ? "" : asString(input.promotionalText ?? existing?.promotionalText, "", 200),
      supportingText: isHeroCampaign ? "" : asString(input.supportingText ?? existing?.supportingText, "", 280),
      cta: ctaResult.cta,
      wholeBannerClickable,
      status: statusRaw,
      startsAt: startParsed.iso,
      endsAt: endParsed.iso,
      timezone: BANNER_TIMEZONE,
      priority,
      categorySlug: "",
    },
  };
}

export function adminBannerView(banner: BannerRecord, now: Date = new Date()) {
  return {
    ...banner,
    currentlyActive: isBannerCurrentlyActive(banner, now),
    activityLabel: activityLabel(banner, now),
  };
}

/** Format an ISO instant as `YYYY-MM-DDTHH:mm` for datetime-local in Asia/Kolkata. */
export function toDatetimeLocalIst(iso: string) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const shifted = new Date(ms + IST_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function toDateOnlyIst(iso: string) {
  const local = toDatetimeLocalIst(iso);
  return local.slice(0, 10);
}
