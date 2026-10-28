import type { Metadata } from "next";
import { noIndexRobots } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  robots: noIndexRobots(),
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
