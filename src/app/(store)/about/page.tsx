import type { Metadata } from "next";
import { AboutPage } from "@/components/content/Pages";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Our story",
  description: "Silken Knot makes body care, bath, aromatherapy, and quiet apparel for everyday rituals.",
  path: "/about",
});

export default function Page() {
  return <AboutPage />;
}
