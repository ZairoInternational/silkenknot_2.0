# Studio (Admin) — page override

> Overrides [`../MASTER.md`](../MASTER.md) for `/admin` only.
> Keep MASTER color tokens. Comfort and clarity come from layout and controls — not step lists or a new brand theme.

## Goal

Studio should feel like a modern ops panel: calm, scannable, obvious controls. Admins understand the job from labels, grouping, and CTAs — not numbered tutorials on every page.

## Colors

Use existing tokens only: cream, paper, ink, mute, line, mist gold.

## Layout

- Compact sidebar (`w-56`), sticky top bar, main padding `py-6` / `md:py-8`.
- Page titles: `text-2xl font-semibold` (not storefront display serif).
- One short purpose line under the title. **Do not** add how-to step lists on headers.
- Long editors: collapsible `AdminPanel` sections; secondary panels may start closed.
- Sticky bottom `AdminStickyActions` for primary Save on long forms.

## Shared primitives

From `src/components/admin/AdminShell.tsx`:

- `adminBtn` — sentence-case, rounded-lg, `h-10`
- `adminControl.input | select | textarea` — bordered fields (not underline-only)
- `AdminPageHeader`, `AdminPanel`, `AdminEmptyState`, `AdminFilterBar`, `AdminStatCard`
- `AdminStickyActions` for long-form save bars

## Copy

- Short purpose: what this screen is.
- Button labels: clear and short (`Save product`, not essay CTAs).
- Empty states: one next action.
- Prefer UI affordance over instructional paragraphs.

## Checklist

- [ ] Colors unchanged from MASTER
- [ ] No header step lists
- [ ] Inputs use bordered `adminControl` styles
- [ ] Primary CTA visible (sticky on long pages)
- [ ] `cursor-pointer` + focus rings on controls
