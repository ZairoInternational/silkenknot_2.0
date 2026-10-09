import { SiteChrome } from "@/components/providers";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
