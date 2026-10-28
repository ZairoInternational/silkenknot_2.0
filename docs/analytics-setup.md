# Silken Knot analytics setup (GA4 + GTM)

## Architecture

- **GA4** is the analytics product (reports, DebugView, ecommerce).
- **GTM** is the only tag loader in the app. Events are pushed to `window.dataLayer`; GA4 tags in GTM forward them.
- A small TypeScript helper lives under `src/lib/analytics/`. UI and store call typed `track*` functions; they never talk to GA4 directly.
- Container id: `NEXT_PUBLIC_GTM_ID` (e.g. `GTM-XXXXXXX`). Invalid or missing values keep analytics fully off.
- **No automatic `page_view` is pushed from the app.** Configure a single History Change / page view tag in GTM so SPA navigations are not double-counted. Do not also enable a duplicate GA4 config tag that sends its own page views unless you disable one of them.

## Consent

With `NEXT_PUBLIC_GTM_ID` set:

1. **GTM loads** (so Tag Assistant / Network can see `gtm.js`).
2. **Consent Mode defaults to denied** before `gtm.js` (ad_* and `analytics_storage`).
3. A storefront banner asks Accept / Decline when the choice is unset.
4. **Ecommerce `dataLayer` events still no-op** until Accept (`analytics_storage` updated to granted).

Storage key: `silkknot.analytics.consent` (`granted` | `denied`).

Helpers: `grantAnalyticsConsent()`, `revokeAnalyticsConsent()`, `hasAnalyticsConsent()`.

In GTM, enable Consent Overview and require `analytics_storage` for GA4 tags so denied mode does not send hits.

Privacy copy should mention analytics cookies (banner already links to `/privacy`).

## Environment

```bash
# .env.local (public container id only — never Measurement Protocol secrets)
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

Restart `npm run dev` after changing env.

## Events and trigger points

| Event | When it fires | Payload notes |
| --- | --- | --- |
| `view_item` | Product detail (`ProductLayout`) once per product id when the store is ready | `currency: INR`, `value`, `items[]` |
| `search` | Search overlay after debounce (≥2 chars), not per keystroke | `search_term` sanitized; PII-like terms dropped |
| `add_to_cart` | `store.addToCart` after a successful add only | `currency`, `value`, `items` with qty added |
| `add_to_wishlist` | `toggleWishlist` / `moveToWishlist` only when newly saved | product id, name, price, category |
| `begin_checkout` | First checkout step (`/checkout`) when the bag is non-empty | cart snapshot; session fingerprint + short dedupe |
| `purchase` | `/checkout/thank-you` after the confirmed order is loaded | `transaction_id` = order id; value/items/shipping from order |

### Purchase semantics

- Online (Razorpay): thank-you runs only after `/api/checkout/verify` (or create-order already verified) wrote the session order, then the page re-fetches `/api/checkout/order`.
- **COD:** fires when the COD order was **placed** server-side (`placed` from create-order) and thank-you opens. That matches “order confirmed / pay on delivery,” not an unpaid abandoned attempt.
- Failed payment / dismissed Razorpay modal: no `purchase`.
- Deduping: order id is stored in `localStorage` (`silkknot.analytics.purchases`) so refresh/revisit does not send again. This is **client-device** protection, not cross-device. A later Measurement Protocol sender on the server would be stronger; do not change payment flows for analytics.

## Configure GTM → GA4 (manual)

Code does **not** publish your GTM container. In GTM:

1. Create a GA4 Configuration tag with your Measurement ID. Trigger: Consent Initialization / All Pages as you prefer — keep **one** page-view strategy.
2. Enable GTM Consent Overview; default `analytics_storage` to denied until your banner grants it (align with the app gate).
3. For each event (`view_item`, `search`, `add_to_cart`, `add_to_wishlist`, `begin_checkout`, `purchase`):
   - Trigger: Custom Event matching the event name.
   - Tag: GA4 Event, event name identical to the dataLayer event.
   - For ecommerce events, map `ecommerce` fields (items, value, currency, transaction_id, shipping) per GA4 ecommerce docs.
4. Submit and publish the container.

## How to test

1. Set `NEXT_PUBLIC_GTM_ID`, grant consent (banner or localStorage), reload.
2. GTM Preview: connect to the site; confirm the six custom events and payloads (no email/phone/address).
3. GA4 Admin → DebugView: confirm the same events arrive after the GA4 tags fire.
4. Refresh thank-you: a second `purchase` must not appear for the same `transaction_id`.
5. Unit tests: `npm test` (includes `src/lib/analytics/analytics.test.ts`).

Do not treat DebugView as green until the GTM container is published and linked to the GA4 property.

## Security / privacy checklist

- No payment secrets, session tokens, OTP, addresses, or raw user ids in the dataLayer.
- Order `transaction_id` is the internal order id (stable, not an email).
- Analytics never decides payment status or amounts for the business; it only reads already-confirmed order/cart state.
- Checkout, Razorpay verify, inventory, and coupons are intentionally untouched by this work.
