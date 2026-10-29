# Silken Knot SEO setup

Technical SEO lives in `src/lib/seo/*`, `src/app/sitemap.ts`, and `src/app/robots.ts`.

No setup can guarantee #1 rankings. This stack makes genuine product pages eligible to be crawled, understood, and ranked for relevant searches.

## Vercel + silkenknot.com

Canonical host after cutover: **`https://www.silkenknot.com`**  
Current app: **`https://silkenknot-2-0.vercel.app`**

Full migration steps: **[docs/seo-cutover.md](./seo-cutover.md)**.

1. **Until DNS points at Vercel**, Production env must be:
   `NEXT_PUBLIC_SITE_URL=https://silkenknot-2-0.vercel.app`
2. **After cutover**, change it to:
   `NEXT_PUBLIC_SITE_URL=https://www.silkenknot.com` and redeploy.
3. Preview / branch URLs stay **noindex** automatically.
4. Optional: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` for Search Console HTML verification.

## Google Search Console (do this on production)

1. Verify ownership (HTML tag → set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, or DNS TXT).
2. Submit sitemap: `/sitemap.xml`.
3. Use URL Inspection on homepage + 2–3 product URLs → Request indexing.
4. Watch Coverage / Page indexing for soft-404s or excluded URLs.

## What ranks products (beyond code)

Technical SEO is the floor. Ranking also needs:

1. **Unique product content** — real descriptions, ingredients, how-to-use (already on PDPs when filled in Studio).
2. **Internal links** — homepage, shop, categories, related products (in place).
3. **Reviews** — genuine visible reviews help Product rich results when present.
4. **Speed on mobile** — measure with PageSpeed Insights after deploy.
5. **External discovery** — Instagram, email, directories, Google Merchant Center (Shopping) when ready.
6. **Time** — new domains/stores often need weeks for indexing and months for competitive queries.

## Validate after each production deploy

1. `https://YOUR-HOST/robots.txt` — allows `/`, lists sitemap (production only).
2. `https://YOUR-HOST/sitemap.xml` — products and content URLs.
3. View source on a product — canonical, OG, `application/ld+json`.
4. [Rich Results Test](https://search.google.com/test/rich-results) on a PDP and `/faq`.

## Core Web Vitals

Measure on the live Production URL (not preview):

- PageSpeed Insights
- Search Console → Core Web Vitals

Targets: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
