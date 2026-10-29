# Domain cutover: silkenknot.com → this Next.js app

## Confirmed hosts

| Role | URL |
|------|-----|
| **Canonical production (after cutover)** | `https://www.silkenknot.com` |
| **Current Vercel Production** | `https://silkenknot-2-0.vercel.app` |
| Apex (must redirect to www) | `https://silkenknot.com` |

Pick **one** public host for Google: **`www.silkenknot.com`**. Apex should 301 to www in Vercel Domains.

---

## Phase A — Domain still on the old site (now)

Do **not** point Vercel’s `NEXT_PUBLIC_SITE_URL` at `www.silkenknot.com` yet.  
If you do, the new app’s canonicals and sitemap will claim the domain while visitors still see the **old** site → broken SEO.

### Vercel → Settings → Environment Variables → Production

```bash
NEXT_PUBLIC_SITE_URL=https://silkenknot-2-0.vercel.app
```

(No trailing slash.)

Redeploy Production after saving.

### Google Search Console (optional but useful now)

1. Add property: `https://silkenknot-2-0.vercel.app`
2. Verify (HTML tag or other method).
3. Submit sitemap: `https://silkenknot-2-0.vercel.app/sitemap.xml`
4. Spot-check a product with URL Inspection.

Preview deployments stay noindex automatically.

---

## Phase B — Cutover day (point domain at Vercel)

1. **Vercel → Project → Settings → Domains**
   - Add `www.silkenknot.com`
   - Add `silkenknot.com` and set redirect → `www.silkenknot.com`
2. **DNS** at your registrar (values Vercel shows; typically):
   - `www` → CNAME to `cname.vercel-dns.com` (or the target Vercel displays)
   - Apex `@` → A/ALIAS records Vercel lists
3. Wait until Vercel shows the domain as **Valid**.
4. **Change Production env** to:

```bash
NEXT_PUBLIC_SITE_URL=https://www.silkenknot.com
```

5. **Redeploy** Production (required so Next rebuilds metadata/sitemap with the new origin).
6. Confirm:
   - `https://www.silkenknot.com` loads **this** store (not the old site)
   - `https://silkenknot.com` redirects to `https://www.silkenknot.com`
   - `https://www.silkenknot.com/robots.txt` and `/sitemap.xml` look correct
   - A product page source shows  
     `canonical` → `https://www.silkenknot.com/products/...`
7. **Search Console**
   - Add property `https://www.silkenknot.com`
   - Submit `https://www.silkenknot.com/sitemap.xml`
   - Request indexing for home + key products
8. If the old site had important indexed URLs with **different paths**, add 301 redirects in `next.config.ts` (or Vercel redirects) from old paths → new ones. Do not dump everything to `/`.

---

## Local `.env.local`

Use the final canonical host for local metadata previews:

```bash
NEXT_PUBLIC_SITE_URL=https://www.silkenknot.com
```

That does not change what Vercel Production uses until you set the same var there.
