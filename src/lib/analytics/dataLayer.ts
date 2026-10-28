import { browserWindow } from "./browser";
import { hasAnalyticsConsent } from "./consent";
import { getGtmId } from "./config";
import type { AnalyticsEventMap, AnalyticsEventName } from "./types";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown> | unknown[]>;
  }
}

export function ensureDataLayer() {
  const win = browserWindow();
  if (!win) return null;
  win.dataLayer = win.dataLayer || [];
  return win.dataLayer;
}

export function analyticsEnabled() {
  return Boolean(browserWindow()) && Boolean(getGtmId()) && hasAnalyticsConsent();
}

/**
 * Push a GA4 ecommerce event for GTM to forward.
 * Clears prior ecommerce object first (GTM/GA4 recommended pattern).
 */
export function pushEcommerceEvent<E extends AnalyticsEventName>(
  event: E,
  payload: AnalyticsEventMap[E],
): boolean {
  if (!analyticsEnabled()) return false;
  const layer = ensureDataLayer();
  if (!layer) return false;
  try {
    layer.push({ ecommerce: null });
    layer.push({ event, ecommerce: payload });
    return true;
  } catch {
    return false;
  }
}

/** Non-ecommerce events (e.g. search). */
export function pushEvent<E extends AnalyticsEventName>(
  event: E,
  payload: AnalyticsEventMap[E],
): boolean {
  if (!analyticsEnabled()) return false;
  const layer = ensureDataLayer();
  if (!layer) return false;
  try {
    if (event === "search") {
      layer.push({ event, ...payload });
      return true;
    }
    return pushEcommerceEvent(event, payload);
  } catch {
    return false;
  }
}
