import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/Studio";
import { noIndexRobots } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Studio",
  robots: noIndexRobots(),
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
