"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { Heart, House, ShoppingBag, Store } from "lucide-react";
import { itemCount } from "@/lib/format";
import type { LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";

type BarItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  active: boolean;
  onClick?: () => void;
};

export function accountBarPath(pathname: string) {
  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout") || pathname === "/account/login") return false;
  return true;
}

function itemsFor(pathname: string, cartOpen: boolean): BarItem[] {
  return [
    { key: "home", label: "Home", icon: House, href: "/", active: pathname === "/" },
    { key: "shop", label: "Shop", icon: Store, href: "/shop", active: pathname.startsWith("/shop") || pathname.startsWith("/products") },
    { key: "wishlist", label: "Wishlist", icon: Heart, href: "/wishlist", active: pathname.startsWith("/wishlist") },
    { key: "bag", label: "Bag", icon: ShoppingBag, active: cartOpen },
  ];
}

export function MobileAccountBar() {
  const pathname = usePathname();
  const store = useStore();
  const [shown, setShown] = useState(true);
  const idle = useRef<number | undefined>(undefined);

  function revealSoon() {
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setShown(true), 220);
  }

  useEffect(() => {
    function onScroll() {
      if (window.scrollY < 8) {
        window.clearTimeout(idle.current);
        setShown(true);
        return;
      }
      setShown(false);
      revealSoon();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll);
      window.clearTimeout(idle.current);
    };
  }, []);

  useLenis((lenis) => {
    if (!lenis || lenis.scroll < 8) {
      window.clearTimeout(idle.current);
      setShown(true);
      return;
    }
    if (lenis.isScrolling) {
      setShown(false);
      revealSoon();
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--mobile-nav-shift", shown ? "0px" : "3.75rem");
    return () => {
      root.style.removeProperty("--mobile-nav-shift");
    };
  }, [shown]);

  if (!accountBarPath(pathname) || !store.ready) return null;

  const items = itemsFor(pathname, store.cartOpen);

  return (
    <nav aria-label="Mobile" className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#efe6d8] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform duration-200 md:hidden ${shown ? "translate-y-0" : "translate-y-full"}`}>
      <div className="grid grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const className = `flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] ${item.active ? "font-medium text-[#b08958]" : "text-[#6f675d]"}`;
          const icon = (
            <span className="relative grid size-5 place-items-center">
              <Icon size={18} strokeWidth={1.7} />
              {item.key === "bag" && itemCount(store.cart) > 0 ? (
                <span className="absolute -right-2 -top-1.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-[#d21f2b] px-0.5 text-[8px] leading-none text-white">{itemCount(store.cart)}</span>
              ) : null}
            </span>
          );
          const label = <span className="text-[10px] font-normal leading-none">{item.label}</span>;
          if (!item.href) {
            return (
              <button key={item.key} type="button" className={className} onClick={() => store.openCart()}>
                {icon}
                {label}
              </button>
            );
          }
          return (
            <Link key={item.key} href={item.href} className={className}>
              {icon}
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
