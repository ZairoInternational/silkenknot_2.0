import type { Metadata } from "next";
import { JournalIndex } from "@/components/content/Pages";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Journal",
  description: "Notes from the Silken Knot studio on bath rituals, scent, and linen after water.",
  path: "/journal",
});

export default function Page() {
  return <JournalIndex />;
}
