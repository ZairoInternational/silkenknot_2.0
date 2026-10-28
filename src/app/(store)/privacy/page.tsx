import type { Metadata } from "next";
import { PrivacyPage } from "@/components/content/Pages";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy",
  description: "What Silken Knot asks for, why we ask for it, and how we look after your information.",
  path: "/privacy",
});

export default function Page() {
  return <PrivacyPage />;
}
