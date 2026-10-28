import type { Metadata } from "next";
import { PaymentsPolicyPage } from "@/components/content/PaymentsPolicy";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Payment & pricing",
  description:
    "How Silken Knot prices, platform fees, coupons, Razorpay payments, and cash on delivery work at checkout.",
  path: "/payments",
});

export default function Page() {
  return <PaymentsPolicyPage />;
}
