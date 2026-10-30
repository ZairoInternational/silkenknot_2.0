"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getGtmId,
  grantAnalyticsConsent,
  needsAnalyticsConsentChoice,
  revokeAnalyticsConsent,
  subscribeAnalyticsConsent,
} from "@/lib/analytics";

/**
 * Minimal analytics opt-in. Shown only when GTM is configured and the customer
 * has not yet accepted or declined. Declining keeps Consent Mode denied and
 * blocks ecommerce dataLayer events. Full-bleed bottom bar until a choice.
 */
export function AnalyticsConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      setVisible(Boolean(getGtmId()) && needsAnalyticsConsentChoice());
    };
    sync();
    return subscribeAnalyticsConsent(sync);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed bottom-0 left-0 right-0 z-[9999] w-full border-t border-[#e3dbd1] bg-[#f6f3ee] text-[#2c2926] shadow-[0_-12px_40px_-18px_rgba(0,0,0,0.35)]"
    >
      <div className="flex w-full flex-col gap-4 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 space-y-1">
          <p id="cookie-consent-title" className="text-sm font-medium text-[#2c2926] sm:text-base">
            We respect your privacy
          </p>
          <p id="cookie-consent-desc" className="text-sm leading-relaxed text-[#4e4943]">
            This website uses cookies to ensure you get the best experience.{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-[#2c2926]">
              Privacy Policy
            </Link>
          </p>
        </div>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <button
            type="button"
            className="inline-flex h-11 flex-1 items-center justify-center border border-[#CBAC7C] px-4 text-[11px] uppercase tracking-[0.14em] text-[#8a7350] sm:h-10 sm:flex-none"
            onClick={() => {
              revokeAnalyticsConsent();
              setVisible(false);
            }}
          >
            Reject
          </button>
          <button
            type="button"
            className="inline-flex h-11 flex-1 items-center justify-center bg-[#CBAC7C] px-4 text-[11px] uppercase tracking-[0.14em] text-white hover:bg-[#B39668] sm:h-10 sm:flex-none"
            onClick={() => {
              grantAnalyticsConsent();
              setVisible(false);
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
