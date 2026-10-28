import type { Metadata } from "next";
import { IngredientsPage } from "@/components/content/Pages";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Ingredients",
  description: "What goes into Silken Knot formulas — short lists, recognisable materials, no theatre.",
  path: "/ingredients",
});

export default function Page() {
  return <IngredientsPage />;
}
