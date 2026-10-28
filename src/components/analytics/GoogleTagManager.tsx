"use client";

import { useEffect } from "react";
import Script from "next/script";
import {
  consentDefaultSnippet,
  hasAnalyticsConsent,
  setConfiguredGtmId,
  ensureDataLayer,
} from "@/lib/analytics";

type Props = {
  /** Validated container id from the server layout (NEXT_PUBLIC_GTM_ID). */
  containerId: string | null;
};

/**
 * Loads the GTM container when NEXT_PUBLIC_GTM_ID is configured.
 *
 * Consent Mode defaults to denied before gtm.js. Ecommerce events still require
 * an affirmative opt-in (see AnalyticsConsentBanner) — loading the container
 * alone does not send GA4 hits when tags respect Consent Mode.
 *
 * Page views are left to GTM/GA4 configuration — this app does not push
 * automatic page_view events.
 */
export function GoogleTagManager({ containerId }: Props) {
  useEffect(() => {
    setConfiguredGtmId(containerId);
    if (!containerId) return;
    ensureDataLayer();
    // If consent was granted on a previous visit, sync Consent Mode after load.
    if (hasAnalyticsConsent()) {
      const layer = ensureDataLayer();
      layer?.push([
        "consent",
        "update",
        {
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
          analytics_storage: "granted",
        },
      ] as unknown as Record<string, unknown>);
    }
  }, [containerId]);

  if (!containerId) return null;

  return (
    <Script id="silkknot-gtm" strategy="afterInteractive">{`
${consentDefaultSnippet()}
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${containerId}');
    `}</Script>
  );
}
