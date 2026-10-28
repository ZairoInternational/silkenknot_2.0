/**
 * Analytics consent gate.
 *
 * GTM may load whenever NEXT_PUBLIC_GTM_ID is set (Consent Mode defaults denied).
 * Ecommerce events still no-op until the customer opts in via the banner.
 */

import { browserWindow } from "./browser";
import { getGtmId } from "./config";

export const ANALYTICS_CONSENT_KEY = "silkknot.analytics.consent";
export const ANALYTICS_CONSENT_EVENT = "silkknot-analytics-consent";

export type AnalyticsConsent = "granted" | "denied" | "unset";

function storage() {
  return browserWindow()?.localStorage;
}

export function readAnalyticsConsent(): AnalyticsConsent {
  const local = storage();
  if (!local) return "unset";
  try {
    const value = local.getItem(ANALYTICS_CONSENT_KEY);
    if (value === "granted") return "granted";
    if (value === "denied") return "denied";
    return "unset";
  } catch {
    return "unset";
  }
}

export function hasAnalyticsConsent() {
  return readAnalyticsConsent() === "granted";
}

/** True until the customer accepts or declines (banner should show). */
export function needsAnalyticsConsentChoice() {
  return readAnalyticsConsent() === "unset";
}

function pushConsentToDataLayer(state: "granted" | "denied") {
  if (!getGtmId()) return;
  const win = browserWindow();
  if (!win) return;
  try {
    win.dataLayer = win.dataLayer || [];
    const analytics = state === "granted" ? "granted" : "denied";
    win.dataLayer.push({ event: "silkknot_consent_update" });
    // Consent Mode update command (GTM Consent Overview)
    win.dataLayer.push([
      "consent",
      "update",
      {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: analytics,
      },
    ] as unknown as Record<string, unknown>);
  } catch {
    /* ignore */
  }
}

function writeConsent(value: "granted" | "denied") {
  const win = browserWindow();
  const local = win?.localStorage;
  if (!win || !local) return;
  try {
    local.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    /* private mode / blocked storage */
  }
  pushConsentToDataLayer(value);
  win.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
}

/** Call from the consent banner after the customer opts in. */
export function grantAnalyticsConsent() {
  writeConsent("granted");
}

/** Call when the customer opts out. */
export function revokeAnalyticsConsent() {
  writeConsent("denied");
}

export function subscribeAnalyticsConsent(listener: () => void) {
  const win = browserWindow();
  if (!win) return () => {};
  win.addEventListener(ANALYTICS_CONSENT_EVENT, listener);
  win.addEventListener("storage", listener);
  return () => {
    win.removeEventListener(ANALYTICS_CONSENT_EVENT, listener);
    win.removeEventListener("storage", listener);
  };
}

/** Default Consent Mode state pushed before gtm.js loads. */
export function consentDefaultSnippet(): string {
  return `window.dataLayer=window.dataLayer||[];window.dataLayer.push(['consent','default',{'ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','analytics_storage':'denied','wait_for_update':500}]);`;
}
