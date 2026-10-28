import type { Metadata } from "next";
import { FaqPage } from "@/components/content/Pages";
import { JsonLd } from "@/components/seo/JsonLd";
import { sharedFaqs } from "@/lib/data";
import { faqPageJsonLd } from "@/lib/seo/jsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "FAQ",
  description: "Shipping, returns, scent strength, and other practical questions about shopping with Silken Knot.",
  path: "/faq",
});

export default function Page() {
  return (
    <>
      <JsonLd data={faqPageJsonLd(sharedFaqs)} />
      <FaqPage />
    </>
  );
}
