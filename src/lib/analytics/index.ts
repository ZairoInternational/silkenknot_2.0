export { getGtmId, isAnalyticsConfigured, parseGtmId, setConfiguredGtmId } from "./config";
export {
  ANALYTICS_CONSENT_KEY,
  consentDefaultSnippet,
  grantAnalyticsConsent,
  hasAnalyticsConsent,
  needsAnalyticsConsentChoice,
  readAnalyticsConsent,
  revokeAnalyticsConsent,
  subscribeAnalyticsConsent,
} from "./consent";
export { ensureDataLayer, analyticsEnabled, pushEvent, pushEcommerceEvent } from "./dataLayer";
export {
  trackViewItem,
  trackSearch,
  trackAddToCart,
  trackAddToWishlist,
  trackBeginCheckout,
  trackPurchase,
} from "./events";
export {
  categoryNameFor,
  itemFromProduct,
  itemFromCartLine,
  itemsFromCart,
  cartValue,
} from "./items";
export { sanitizeSearchTerm } from "./searchTerm";
export { claimPurchaseTracking, hasTrackedPurchase } from "./purchaseDedupe";
export type {
  AnalyticsItem,
  AnalyticsEventName,
  AnalyticsEventMap,
  PurchasePayload,
} from "./types";
