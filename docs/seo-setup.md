# Silken Knot SEO setup

Technical SEO is implemented in the Next.js App Router (`src/lib/seo/*`, `src/app/sitemap.ts`, `src/app/robots.ts`).

## Required environment

Set the public storefront origin (no trailing slash):

```bash
NEXT_PUBLIC_SITE_URL=https://YOUR-PRODUCTION-DOMAIN
```

Optional server-only alias: `SITE_URL`.

Without this, canonical URLs, Open Graph, sitemap, and robots fall back to `http://localhost:3000`.

Email examples in the repo mention `silkenknot.com`, but the live canonical host must be confirmed (www vs apex, custom domain on the VPS).

## Optional Google Search Console

1. Verify ownership in Search Console (HTML tag or DNS).
2. For the HTML tag method, set:

```bash
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your-token-from-google
```

3. Submit `https://YOUR-PRODUCTION-DOMAIN/sitemap.xml`.

## What the app emits

| Surface | Behavior |
|---------|----------|
| `/robots.txt` | Allows public storefront; disallows admin, API, checkout, account, wishlist, orders |
| `/sitemap.xml` | Home, shop, category shop URLs, active products, journal, content pages |
| Product pages | Live Mongo (or seed) metadata, canonical, Product + BreadcrumbList JSON-LD; HTTP 404 when missing/inactive |
| Shop filters | Category-only URLs indexable; search/sort/pagination/price filters `noindex` with canonical to `/shop` or category |
| Private routes | `noindex` via layout/page metadata |

## Validate after deploy

1. Open `/robots.txt` and `/sitemap.xml` on production.
2. View source on a product URL — confirm `<link rel="canonical">`, OG tags, and `application/ld+json`.
3. [Google Rich Results Test](https://search.google.com/test/rich-results) on a representative product and `/faq`.
4. [URL Inspection](https://search.google.com/search-console) after GSC verification.

## Measurement (Core Web Vitals)

Code changes do not prove LCP/INP/CLS improvements. Measure with:

- Chrome DevTools → Lighthouse (mobile)
- PageSpeed Insights on production URLs
- CrUX / Search Console Core Web Vitals (field data)

Targets: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.

## Content / Merchant Center (not automated here)

- Do not mass-rewrite product copy without a reversible review plan.
- Google Merchant Center product feeds need a separate feed or Content API integration when you are ready.
