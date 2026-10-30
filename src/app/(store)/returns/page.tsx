import type { Metadata } from "next";
import { ReturnsPolicyPage } from "@/components/content/ReturnsPolicy";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Return, Refund and Replacement Policy",
  description:
    "Eligible claims, unboxing video requirements, timelines, resolution options, and refund processing for Silken Knot orders.",
  path: "/returns",
});

export default function Page() {
  return <ReturnsPolicyPage />;
}
