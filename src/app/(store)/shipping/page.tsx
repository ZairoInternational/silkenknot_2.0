import type { Metadata } from "next";
import { ShippingPolicyPage } from "@/components/content/ShippingPolicy";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Shipping & Delivery Policy",
  description:
    "Silken Knot order processing, delivery timelines across India, shipping charges, tracking, and delivery claims including the unboxing video requirement.",
  path: "/shipping",
});

export default function Page() {
  return <ShippingPolicyPage />;
}
