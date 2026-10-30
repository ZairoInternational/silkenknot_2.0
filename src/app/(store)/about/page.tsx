import type { Metadata } from "next";
import { AboutPage } from "@/components/content/Pages";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Our story",
  description:
    "Silken Knot was born from a love of little self-care moments — thoughtful bath and body creations, beautiful fragrances, and everyday rituals that feel like luxury.",
  path: "/about",
});

export default function Page() {
  return <AboutPage />;
}
