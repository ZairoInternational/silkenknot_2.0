import type { Metadata } from "next";
import { FaqPage } from "@/components/content/Pages";
import { JsonLd } from "@/components/seo/JsonLd";
import { sharedFaqs } from "@/lib/data";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { loadPolicy } from "@/lib/shipping/booking";
import { DEFAULT_SHIPPING_DISPLAY, shippingDisplayFromPolicy } from "@/lib/shipping/display";
import { policyFromEnv } from "@/lib/shipping/policy";
import { formatPrice } from "@/lib/format";
import { fillFaqAnswer } from "@/lib/support/faq";
import { faqPageJsonLd } from "@/lib/seo/jsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "FAQ",
  description: "Shipping, returns, scent strength, and other practical questions about shopping with Silken Knot.",
  path: "/faq",
});

async function freeShippingLabel() {
  try {
    const policy = databaseConfigured()
      ? await loadPolicy(await getDb())
      : policyFromEnv(process.env);
    return formatPrice(shippingDisplayFromPolicy(policy).freeShippingAt);
  } catch {
    return formatPrice(DEFAULT_SHIPPING_DISPLAY.freeShippingAt);
  }
}

export default async function Page() {
  const label = await freeShippingLabel();
  const faqs = sharedFaqs.map((faq) => ({
    ...faq,
    answer: fillFaqAnswer(faq.answer, label),
  }));
  return (
    <>
      <JsonLd data={faqPageJsonLd(faqs)} />
      <FaqPage />
    </>
  );
}
