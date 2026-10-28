import type { Metadata } from "next";
import { ContactForm } from "@/components/content/ContactForm";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact & grievance",
  description: "Contact Silken Knot for order help, product questions, or grievance redressal.",
  path: "/contact",
});

export default function Page() {
  return <ContactForm />;
}
