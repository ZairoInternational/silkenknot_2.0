"use client";

import { MotionConfig } from "framer-motion";
import { StoreProvider, useStore } from "@/lib/store";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";
import { CartSheet } from "@/components/layout/CartSheet";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { Toast } from "@/components/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <SmoothScroll>{children}</SmoothScroll>
      </StoreProvider>
    </MotionConfig>
  );
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">
        {children}
      </main>
      <Footer />
      <CartSheet />
      <ToastBridge />
    </>
  );
}

function ToastBridge() {
  const { toast } = useStore();
  return <Toast message={toast?.message ?? null} />;
}
