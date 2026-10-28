import type { Metadata } from "next";
import { TermsPage } from "@/components/content/Pages";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms",
  description: "The agreement for shopping with Silken Knot.",
  path: "/terms",
});

export default function Page() {
  return <TermsPage />;
}
