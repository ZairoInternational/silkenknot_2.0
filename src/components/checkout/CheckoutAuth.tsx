"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { needsName } from "@/lib/auth/browser";
import { useStore } from "@/lib/store";

export function CheckoutAuth({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!store.ready) return;
    if (!store.currentUser) {
      router.replace(`/account/login?next=${encodeURIComponent(pathname || "/checkout/shipping")}`);
      return;
    }
    if (needsName(store.currentUser)) {
      router.replace(`/account?next=${encodeURIComponent(pathname || "/checkout/shipping")}`);
    }
  }, [store.ready, store.currentUser, router, pathname]);

  if (!store.ready || !store.currentUser || needsName(store.currentUser)) {
    return <p className="px-5 py-16 text-mute">Opening checkout…</p>;
  }
  return <>{children}</>;
}
