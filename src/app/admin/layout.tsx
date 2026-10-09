import { AdminShell } from "@/components/admin/Studio";

export const metadata = { title: "Studio" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
