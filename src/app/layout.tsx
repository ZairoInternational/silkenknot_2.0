import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { AnalyticsConsentBanner } from "@/components/analytics/AnalyticsConsentBanner";
import { GoogleTagManager } from "@/components/analytics/GoogleTagManager";
import { Providers } from "@/components/providers";
import { JsonLd } from "@/components/seo/JsonLd";
import { parseGtmId } from "@/lib/analytics/config";
import { getBrandSettings } from "@/lib/brand/server";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonLd";
import { buildRootMetadata, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo/metadata";
import { absoluteAssetUrl, absoluteUrl } from "@/lib/seo/site";
import "./globals.css";

const gtmId = parseGtmId(process.env.NEXT_PUBLIC_GTM_ID);

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandSettings();
  return buildRootMetadata({ iconUrl: brand.iconUrl });
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await getBrandSettings();
  const origin = absoluteUrl("/");
  const logoUrl = absoluteAssetUrl(brand.iconUrl);
  const org = organizationJsonLd({
    name: SITE_NAME,
    url: origin,
    logoUrl,
    description: DEFAULT_DESCRIPTION,
    sameAs: ["https://www.instagram.com/silkenknot_/"],
  });
  const site = websiteJsonLd({
    name: SITE_NAME,
    url: origin,
    searchUrlTemplate: `${absoluteUrl("/shop")}?q={search_term_string}`,
  });

  return (
    <html lang="en-IN" className={`${outfit.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(sessionStorage.getItem('silkknot.announce')==='off')document.documentElement.dataset.announce='off'}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full bg-paper font-sans text-ink">
        <JsonLd data={org} />
        <JsonLd data={site} />
        {gtmId ? (
          <noscript>
            <iframe
              title="Google Tag Manager"
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height={0}
              width={0}
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        <GoogleTagManager containerId={gtmId} />
        <Providers>{children}</Providers>
        <AnalyticsConsentBanner />
      </body>
    </html>
  );
}
