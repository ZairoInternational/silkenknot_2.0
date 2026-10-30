# About Page Overrides

> **PROJECT:** Silken Knot
> **Page Type:** Brand story / long-form about
> **Overrides Master:** Yes — pink Liquid Glass + Playfair/Inter from auto Master do **not** apply here.

---

## Design decisions (ui-ux-pro-max)

| Domain | Chosen | Why |
|--------|--------|-----|
| Pattern | Scroll-Triggered Storytelling | Narrative time-on-page; chapter progress + mini CTAs + climax CTA |
| Style | Nature Distilled + Editorial Grid | Wellness/artisan fit; soft earth tones, pull quotes, large imagery |
| Color | Existing Silken Knot tokens | Master pink/lavender conflicts with storefront; progressive chapter tints within `#fbf9f6` → `#efeae3` → mist `#CBAC7C` |
| Type | Outfit (site font) | Next.js stack: fonts live in root layout — do not load Playfair/Inter on this page |
| Motion | Reveal + progress only | UX: ≤1–2 motions per view; `prefers-reduced-motion` via existing `Reveal` |

### Avoid (from skill + brand)

- Liquid Glass pink / purple CTAs
- Cheap visuals, fast bounce animations
- Gray-on-gray body copy
- Missing “you are here” progress
- Full-size unoptimized images (use `Media` + sizes)

### Layout

- Full-bleed hero, then max-w-6xl / max-w-3xl chapters
- Sticky story progress (location feedback)
- Mini CTA end of journey / craft / collection chapters
- Climax CTA on promise

### Chapter color steps (progressive intensity)

1. Hero — full-bleed photo
2. Origin — `#fbf9f6`
3. Feeling — `#f6f3ee`
4. Craft — `#efeae3` split
5. Collection — `#fbf9f6` with numbered editorial rows
6. Details — `#f3eee6`
7. Growing — `#f6f3ee`
8. Promise — soft photo wash + climax CTA
