import type { Metadata } from "next";
import { ReturnsPolicyPage } from "@/components/content/ReturnsPolicy";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Cancellation, returns & refunds",
  description:
    "Cancel before dispatch, final-sale rules, refunds, and how to report damaged or incorrect Silken Knot orders.",
  path: "/returns",
});

export default function Page() {
  return <ReturnsPolicyPage />;
}
