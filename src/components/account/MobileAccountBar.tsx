"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { House, ShoppingBag, Store, User } from "lucide-react";
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

function itemsFor(pathname: string, cartOpen: boolean, accountOpen: boolean): BarItem[] {
  return [
    { key: "home", label: "Home", icon: House, href: "/", active: pathname === "/" },
    { key: "shop", label: "Shop", icon: Store, href: "/shop", active: pathname.startsWith("/shop") || pathname.startsWith("/products") },
    { key: "bag", label: "Bag", icon: ShoppingBag, active: cartOpen },
    { key: "account", label: "Account", icon: User, active: accountOpen || pathname.startsWith("/account") },
  ];
}

export function MobileAccountBar() {
  const pathname = usePathname();
  const store = useStore();
  const [shown, setShown] = useState(true);

  useEffect(() => {
    let frame = 0;
    let last = window.scrollY;
    let intent = 0;
    let visible = true;
    const apply = (y: number) => {
      const delta = y - last;
      last = y;
      if (y <= 8) {
        intent = 0;
        if (!visible) {
          visible = true;
          setShown(true);
        }
        return;
      }
      if ((intent > 0 && delta < 0) || (intent < 0 && delta > 0)) intent = 0;
      intent += delta;
      const next = intent > 8 ? false : intent < -8 ? true : visible;
      if (next === visible) return;
      visible = next;
      setShown(next);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        apply(window.scrollY);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--mobile-nav-shift", shown ? "0px" : "3.75rem");
    return () => {
      root.style.removeProperty("--mobile-nav-shift");
    };
  }, [shown]);

  if (!accountBarPath(pathname) || !store.ready) return null;

  const items = itemsFor(pathname, store.cartOpen, store.accountOpen);

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
              <button
                key={item.key}
                type="button"
                className={className}
                onClick={() => (item.key === "account" ? store.openAccount() : store.openCart())}
              >
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
