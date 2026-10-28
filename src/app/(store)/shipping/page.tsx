import type { Metadata } from "next";
import { ShippingPage } from "@/components/content/Pages";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Shipping",
  description: "Delivery across India, free shipping thresholds, and how to follow your Silken Knot order.",
  path: "/shipping",
});

export default function Page() {
  return <ShippingPage />;
}
