"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckoutPageSkeleton } from "@/components/storefront/PageSkeletons";
import { needsName } from "@/lib/auth/browser";
import { useStore } from "@/lib/store";

function isPostOrderCheckout(pathname: string | null) {
  return Boolean(
    pathname?.startsWith("/checkout/thank-you") || pathname?.startsWith("/checkout/confirmation"),
  );
}

export function CheckoutAuth({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const postOrder = isPostOrderCheckout(pathname);
  const emptyBag = store.ready && !postOrder && store.cart.length === 0;

  useEffect(() => {
    if (!store.ready) return;
    if (!store.currentUser) {
      router.replace(`/account/login?next=${encodeURIComponent(pathname || "/checkout/shipping")}`);
      return;
    }
    if (needsName(store.currentUser)) {
      router.replace(`/account?next=${encodeURIComponent(pathname || "/checkout/shipping")}`);
      return;
    }
    if (!postOrder && store.cart.length === 0) {
      router.replace("/shop");
    }
  }, [store.ready, store.currentUser, store.cart.length, postOrder, router, pathname]);

  if (!store.ready || !store.currentUser || needsName(store.currentUser) || emptyBag) {
    return <CheckoutPageSkeleton />;
  }
  return <>{children}</>;
}
