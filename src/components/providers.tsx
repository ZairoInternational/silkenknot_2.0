"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { StoreProvider, useStore } from "@/lib/store";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";
import { CartSheet } from "@/components/layout/CartSheet";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { accountBarPath, MobileAccountBar } from "@/components/account/MobileAccountBar";
import { RoutePending } from "@/components/RoutePending";
import { Toast } from "@/components/ui";
import { primeBrandCache } from "@/lib/brand/client";
import type { BrandSettings } from "@/lib/brand/content";
import { primeSiteMediaCache } from "@/lib/site-media/client";
import type { SiteMediaSettings } from "@/lib/site-media/content";

const SupportChat = dynamic(
  () => import("@/components/support/SupportChat").then((mod) => mod.SupportChat),
  { ssr: false },
);

export function Providers({
  children,
  initialBrand,
  initialSiteMedia,
}: {
  children: React.ReactNode;
  /** Server-fetched brand so header/footer never flash the default SK mark. */
  initialBrand?: BrandSettings;
  /** Server-fetched site media so home strips skip a client round-trip. */
  initialSiteMedia?: SiteMediaSettings;
}) {
  if (initialBrand) primeBrandCache(initialBrand);
  if (initialSiteMedia) primeSiteMediaCache(initialSiteMedia);

  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <SmoothScroll>{children}</SmoothScroll>
        <MobileAccountBar />
        <RoutePending />
      </StoreProvider>
    </MotionConfig>
  );
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname === "/account/login" || pathname.startsWith("/docs/");
  const accountBar = accountBarPath(pathname);
  return (
    <>
      {bare ? null : <SiteHeader />}
      <div className={accountBar ? "pb-20 md:pb-0" : undefined}>
        <main id="main">
          {children}
        </main>
        {bare ? null : <Footer />}
      </div>
      <CartSheet />
      {bare ? null : <SupportChat />}
      <ToastBridge />
    </>
  );
}

function ToastBridge() {
  const { toast, cartOpen } = useStore();
  return <Toast message={toast?.message ?? null} aboveCart={cartOpen} />;
}
