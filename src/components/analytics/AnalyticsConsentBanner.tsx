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
 * blocks ecommerce dataLayer events. Stays fixed at the bottom until a choice.
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
      className="fixed inset-x-0 bottom-0 z-[9999] border-t border-[#e3dbd1] bg-[#f6f3ee] px-4 py-5 text-[#2c2926] shadow-[0_-16px_48px_-20px_rgba(0,0,0,0.4)] md:px-8"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="min-w-0 space-y-1.5">
          <p id="cookie-consent-title" className="text-base font-medium text-[#2c2926]">
            We respect your privacy
          </p>
          <p id="cookie-consent-desc" className="text-sm leading-relaxed text-[#4e4943]">
            This website uses cookies to ensure you get the best experience.{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-[#2c2926]">
              Privacy Policy
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center border border-[#CBAC7C] px-4 text-[11px] uppercase tracking-[0.14em] text-[#8a7350] hover:bg-[#CBAC7C] hover:text-white"
            onClick={() => {
              revokeAnalyticsConsent();
              setVisible(false);
            }}
          >
            Reject
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center bg-[#CBAC7C] px-4 text-[11px] uppercase tracking-[0.14em] text-white hover:bg-[#B39668]"
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
