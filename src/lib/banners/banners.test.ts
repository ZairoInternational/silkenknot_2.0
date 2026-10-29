import assert from "node:assert/strict";
import test from "node:test";
import {
  activityLabel,
  isBannerPubliclyEligible,
  normalizeBannerWrite,
  parseBannerInstant,
  toDatetimeLocalIst,
  toPublicBanner,
  validateBannerHref,
  validateDateRange,
  type BannerRecord,
} from "@/lib/banners/content";
const baseBanner = (): BannerRecord => ({
  id: "bnr_testbanner01",
  name: "Festive Glow Sale",
  description: "Test",
  placement: "homepage-hero",
  image: {
    desktopUrl: "https://cdn.example.com/banners/desktop.webp",
    mobileUrl: "https://cdn.example.com/banners/mobile.webp",
    alt: "Festive Glow Sale",
  },
  title: "Festive Glow Sale",
  subtitle: "Warm light",
  promotionalText: "Shop the seasonal edit",
  supportingText: "Body care for the festive window.",
  cta: {
    enabled: true,
    label: "Shop the Sale",
    href: "/collections/bestsellers",
    openInNewTab: false,
  },
  wholeBannerClickable: false,
  status: "published",
  startsAt: "2026-10-31T18:30:00.000Z", // 2026-11-01 00:00 IST
  endsAt: "2026-11-15T18:29:59.999Z", // 2026-11-15 23:59:59.999 IST
  timezone: "Asia/Kolkata",
  priority: 10,
  categorySlug: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdBy: "test",
  updatedBy: "test",
});

test("href: allows internal paths and https", () => {
  assert.equal(validateBannerHref("/collections/bestsellers").ok, true);
  assert.equal(validateBannerHref("https://example.com/sale").ok, true);
});

test("href: rejects unsafe and malformed destinations", () => {
  assert.equal(validateBannerHref("javascript:alert(1)").ok, false);
  assert.equal(validateBannerHref("data:text/html,hi").ok, false);
  assert.equal(validateBannerHref("//evil.example").ok, false);
  assert.equal(validateBannerHref("http://insecure.example").ok, false);
  assert.equal(validateBannerHref("").ok, false);
  assert.equal(validateBannerHref("not a url").ok, false);
});

test("timezone: date-only start is midnight Asia/Kolkata", () => {
  const start = parseBannerInstant("2026-11-01", "start");
  assert.equal(start.ok, true);
  if (start.ok) assert.equal(start.iso, "2026-10-31T18:30:00.000Z");
});

test("timezone: date-only end is end of Asia/Kolkata day", () => {
  const end = parseBannerInstant("2026-11-15", "end");
  assert.equal(end.ok, true);
  if (end.ok) assert.equal(end.iso, "2026-11-15T18:29:59.999Z");
});

test("timezone: datetime-local without Z is Asia/Kolkata wall time", () => {
  const start = parseBannerInstant("2026-11-01T10:30", "start");
  assert.equal(start.ok, true);
  if (start.ok) assert.equal(start.iso, "2026-11-01T05:00:00.000Z");
});

test("timezone: round-trip datetime-local IST helper", () => {
  const iso = "2026-10-31T18:30:00.000Z";
  assert.equal(toDatetimeLocalIst(iso), "2026-11-01T00:00");
});

test("dates: start must precede end", () => {
  assert.ok(validateDateRange("2026-11-15T00:00:00.000Z", "2026-11-01T00:00:00.000Z"));
  assert.equal(validateDateRange("2026-11-01T00:00:00.000Z", "2026-11-15T00:00:00.000Z"), null);
});

test("normalize: creates draft without requiring image", () => {
  const result = normalizeBannerWrite({
    name: "Festive Glow Sale",
    placement: "homepage-hero",
    startsAt: "2026-11-01",
    endsAt: "2026-11-15",
    status: "draft",
    cta: { href: "/collections/bestsellers" },
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.banner.status, "draft");
    assert.equal(result.banner.image?.desktopUrl, "");
    assert.equal(result.banner.cta?.href, "/collections/bestsellers");
    assert.equal(result.banner.cta?.label, "");
    assert.equal(result.banner.wholeBannerClickable, true);
  }
});

test("normalize: CTA disabled clears CTA fields", () => {
  const result = normalizeBannerWrite({
    name: "Quiet banner",
    placement: "promotional-strip",
    startsAt: "2026-11-01",
    endsAt: "2026-11-15",
    cta: { enabled: false, label: "Nope", href: "javascript:alert(1)" },
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.banner.cta?.enabled, false);
    assert.equal(result.banner.cta?.label, "");
    assert.equal(result.banner.cta?.href, "");
  }
});

test("normalize: homepage hero accepts optional link without button label", () => {
  const withLink = normalizeBannerWrite({
    name: "Sale",
    placement: "homepage-hero",
    startsAt: "2026-11-01",
    endsAt: "2026-11-15",
    cta: { href: "/collections/bestsellers" },
  });
  assert.equal(withLink.ok, true);
  if (withLink.ok) {
    assert.equal(withLink.banner.cta?.enabled, true);
    assert.equal(withLink.banner.cta?.href, "/collections/bestsellers");
    assert.equal(withLink.banner.cta?.label, "");
    assert.equal(withLink.banner.wholeBannerClickable, true);
    assert.equal(withLink.banner.title, "");
  }

  const noLink = normalizeBannerWrite({
    name: "Sale",
    placement: "homepage-hero",
    startsAt: "2026-11-01",
    endsAt: "2026-11-15",
    cta: { href: "" },
  });
  assert.equal(noLink.ok, true);
  if (noLink.ok) {
    assert.equal(noLink.banner.cta?.enabled, false);
    assert.equal(noLink.banner.wholeBannerClickable, false);
  }
});

test("normalize: promotional CTA enabled requires label and safe href", () => {
  const missingLabel = normalizeBannerWrite({
    name: "Sale",
    placement: "promotional-strip",
    startsAt: "2026-11-01",
    endsAt: "2026-11-15",
    cta: { enabled: true, label: "", href: "/shop" },
  });
  assert.equal(missingLabel.ok, false);

  const badHref = normalizeBannerWrite({
    name: "Sale",
    placement: "promotional-strip",
    startsAt: "2026-11-01",
    endsAt: "2026-11-15",
    cta: { enabled: true, label: "Shop", href: "javascript:evil" },
  });
  assert.equal(badHref.ok, false);
});

test("normalize: publish-ready requires desktop image", () => {
  const result = normalizeBannerWrite(
    {
      name: "Sale",
      placement: "homepage-hero",
      startsAt: "2026-11-01",
      endsAt: "2026-11-15",
      status: "published",
      image: { desktopUrl: "", mobileUrl: "", alt: "x" },
    },
    { requirePublishReady: true },
  );
  assert.equal(result.ok, false);
});

test("normalize: keeps existing desktop url when only link changes", () => {
  const existing = baseBanner();
  const result = normalizeBannerWrite(
    {
      cta: { href: "/shop" },
      image: { desktopUrl: existing.image.desktopUrl, mobileUrl: existing.image.mobileUrl, alt: existing.image.alt },
    },
    { existing, requirePublishReady: true },
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.banner.image?.desktopUrl, existing.image.desktopUrl);
    assert.equal(result.banner.cta?.href, "/shop");
    assert.equal(result.banner.wholeBannerClickable, true);
  }
});

test("eligibility: exact start boundary is included", () => {
  const banner = baseBanner();
  const atStart = new Date("2026-10-31T18:30:00.000Z");
  assert.equal(isBannerPubliclyEligible(banner, atStart), true);
});

test("eligibility: exact end boundary is included", () => {
  const banner = baseBanner();
  const atEnd = new Date("2026-11-15T18:29:59.999Z");
  assert.equal(isBannerPubliclyEligible(banner, atEnd), true);
});

test("eligibility: before start is hidden", () => {
  const banner = baseBanner();
  const early = new Date("2026-10-31T18:29:59.999Z");
  assert.equal(isBannerPubliclyEligible(banner, early), false);
});

test("eligibility: after end is hidden", () => {
  const banner = baseBanner();
  const late = new Date("2026-11-15T18:30:00.000Z");
  assert.equal(isBannerPubliclyEligible(banner, late), false);
});

test("eligibility: draft and archived never public", () => {
  const now = new Date("2026-11-05T00:00:00.000Z");
  assert.equal(isBannerPubliclyEligible({ ...baseBanner(), status: "draft" }, now), false);
  assert.equal(isBannerPubliclyEligible({ ...baseBanner(), status: "archived" }, now), false);
});

test("eligibility: scheduled is public inside window", () => {
  const now = new Date("2026-11-05T00:00:00.000Z");
  assert.equal(isBannerPubliclyEligible({ ...baseBanner(), status: "scheduled" }, now), true);
});

test("eligibility: missing desktop image is not public", () => {
  const now = new Date("2026-11-05T00:00:00.000Z");
  const banner = baseBanner();
  banner.image.desktopUrl = "";
  assert.equal(isBannerPubliclyEligible(banner, now), false);
});

test("activity label distinguishes published-but-expired", () => {
  const banner = baseBanner();
  const after = new Date("2026-11-20T00:00:00.000Z");
  assert.match(activityLabel(banner, after), /Expired/);
});

test("public mapper strips admin fields and disabled CTA", () => {
  const pub = toPublicBanner({ ...baseBanner(), cta: { enabled: false, label: "X", href: "/x", openInNewTab: true }, createdBy: "admin-secret" });
  assert.equal("createdBy" in pub, false);
  assert.equal(pub.cta.enabled, false);
  assert.equal(pub.cta.label, "");
  assert.equal(pub.cta.href, "");
});

test("public mapper: mobile image kept for responsive full-bleed hero", () => {
  const pub = toPublicBanner(baseBanner());
  assert.equal(pub.image.mobileUrl, "https://cdn.example.com/banners/mobile.webp");
  assert.equal(pub.placement, "homepage-hero");
});

test("public mapper: whole banner clickable only when CTA enabled", () => {
  const withCta = toPublicBanner({ ...baseBanner(), wholeBannerClickable: true });
  assert.equal(withCta.wholeBannerClickable, true);
  const withoutCta = toPublicBanner({
    ...baseBanner(),
    cta: { enabled: false, label: "", href: "", openInNewTab: false },
    wholeBannerClickable: true,
  });
  assert.equal(withoutCta.wholeBannerClickable, false);
});

test("invalid calendar date is rejected", () => {
  const bad = parseBannerInstant("2026-02-31", "start");
  assert.equal(bad.ok, false);
});
