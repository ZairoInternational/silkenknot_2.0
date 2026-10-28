import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { AnalyticsConsentBanner } from "@/components/analytics/AnalyticsConsentBanner";
import { GoogleTagManager } from "@/components/analytics/GoogleTagManager";
import { Providers } from "@/components/providers";
import { parseGtmId } from "@/lib/analytics/config";
import { getBrandSettings } from "@/lib/brand/server";
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
  return {
    title: {
      default: "Silken Knot — Body care, bath & wellness",
      template: "%s · Silken Knot",
    },
    description:
      "Body care, bath essentials, aromatherapy, and quiet apparel. Everyday rituals, made better.",
    icons: {
      icon: [{ url: brand.iconUrl }],
      apple: [{ url: brand.iconUrl }],
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
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
