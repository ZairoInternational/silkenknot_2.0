import type { Metadata } from "next";
import { PrivacyPolicyPage } from "@/components/content/PrivacyPolicy";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "How Silken Knot collects, uses, stores and protects personal information when you visit our website, place orders or contact us.",
  path: "/privacy",
});

export default function Page() {
  return <PrivacyPolicyPage />;
}
