# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Silken Knot
**Category:** Luxury / bath & body e-commerce
**Note:** Auto-generated pink Liquid Glass palette was replaced with live storefront tokens.

---

## Global Rules

### Color Palette

| Role | Hex | Notes |
|------|-----|-------|
| Paper / bg | `#f6f3ee` / `#fbf9f6` | Page surfaces |
| Cream | `#efeae3` | Section alternate |
| Ink | `#1c1b19` | Primary text |
| Mute | `#475569` min / `#6d675f` | Body (contrast ≥ slate-600) |
| Accent / CTA | `#CBAC7C` → hover `#B39668` | Mist gold |
| Eyebrow | `#8a7350` | Small labels |
| Line | `#e3dbd1` | Borders |

### Typography

- **Heading / body:** Outfit (loaded in `src/app/layout.tsx` as `--font-outfit`)
- Do **not** add Playfair/Inter on individual pages
- Mood: elegant, calm, editorial; oversized display ok on heroes (`clamp`)

### Spacing

- Section: `py-16 md:py-24`
- Container: `max-w-6xl` media chapters, `max-w-3xl` prose
- Organic radius: `rounded-[1.5rem]`–`rounded-[1.75rem]`

### Layout

- Pattern default: scroll storytelling for brand pages; shop keeps existing grids
- Full-bleed heroes on branded marketing surfaces
- Soft natural shadows: `0 8px 32px rgba(28,27,25,0.08)`

### Components

- CTA: rounded-full mist gold, `cursor-pointer`, `transition-colors duration-200`
- Links: underline/border-b mist, no layout-shifting scale on controls
- Icons: Lucide only (no emoji)
- Images: `Media` with `sizes`; hero `priority` only above fold

### Effects

- Style lean: Nature Distilled (grain, soft shadow, warm tints) — not pink glass
- Motion: existing `Reveal`; respect `prefers-reduced-motion`
- Transitions 150–300ms; no infinite decorative bounce

### Do / Don't

**Do**
- Brand name hero-level on branded pages
- Visible focus rings
- Progressive chapter tints on long stories
- Mini CTAs + climax CTA on story pages

**Don't**
- Purple / pink luxury defaults
- Gray-on-gray copy
- Animate every element
- Load second font families ad hoc

### Pre-Delivery Checklist

- [ ] No emoji icons
- [ ] `cursor-pointer` on clickables
- [ ] Hover 150–300ms
- [ ] Light text contrast 4.5:1+
- [ ] Focus visible
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive 375 / 768 / 1024 / 1440
