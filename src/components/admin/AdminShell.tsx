"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Mark } from "@/components/ui";
import { AdminShellSkeleton } from "@/components/admin/AdminSkeletons";
import { useStore } from "@/lib/store";

type NavItem = { label: string; href: string; hint: string };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Daily work",
    items: [
      { label: "Overview", href: "/admin", hint: "Numbers and common tasks" },
      { label: "Orders", href: "/admin/orders", hint: "Pack, ship, and track" },
      { label: "Products", href: "/admin/products", hint: "Catalog, prices, stock, photos" },
      { label: "Customers", href: "/admin/customers", hint: "Accounts and order history" },
    ],
  },
  {
    title: "Catalog",
    items: [
      { label: "Categories", href: "/admin/categories", hint: "Shop groups and search thumbs" },
      { label: "Discount codes", href: "/admin/offers", hint: "Coupon codes at checkout" },
    ],
  },
  {
    title: "Website",
    items: [
      { label: "Homepage hero", href: "/admin/hero", hint: "Sale slide and product slides" },
      { label: "Banners & Campaigns", href: "/admin/banners", hint: "Full-bleed hero and promo strip" },
      { label: "Website photos", href: "/admin/site-media", hint: "Banners, strip, login, checkout" },
      { label: "Logo", href: "/admin/brand", hint: "File, size, and display per surface" },
      { label: "Announcement", href: "/admin/announcements", hint: "Rotating bar at the top" },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Account", href: "/admin/account", hint: "Studio password" },
      { label: "Shipping / Delivery", href: "/admin/shipping", hint: "Rates, Delhivery, COD" },
      { label: "Platform fee", href: "/admin/fees", hint: "Checkout platform fee" },
    ],
  },
];

function navItemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminPageHeader({
  title,
  purpose,
  action,
}: {
  title: string;
  purpose: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="font-serif text-4xl md:text-5xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-mute">{purpose}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Expand/collapse section used across Studio editors. */
export function AdminPanel({
  title,
  hint,
  children,
  defaultOpen = true,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-paper">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-mute">{title}</p>
          {hint ? <p className="mt-1 text-xs text-mute">{hint}</p> : null}
        </div>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={`shrink-0 text-mute transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? <div className="space-y-5 border-t border-line px-5 py-5">{children}</div> : null}
    </section>
  );
}

function AdminNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = navItemActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={`block rounded-lg px-2 py-2 ${active ? "bg-cream text-ink" : "text-mute hover:text-ink"}`}
    >
      <span className={`block text-sm ${active ? "font-medium" : ""}`}>{item.label}</span>
      <span className="mt-0.5 block text-[11px] leading-snug text-mute">{item.hint}</span>
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const login = pathname === "/admin/login";

  useEffect(() => {
    if (!store.ready) return;
    if (!store.adminAuthed && !login) router.replace("/admin/login");
    if (store.adminAuthed && login) router.replace("/admin");
  }, [store.ready, store.adminAuthed, login, router]);

  // Login paints immediately — no need to wait on catalog hydrate.
  if (login) {
    if (store.ready && store.adminAuthed) return null;
    return <div className="min-h-screen bg-cream">{children}</div>;
  }

  if (!store.ready) return <AdminShellSkeleton />;
  if (!store.adminAuthed) return null;

  return (
    <div className="min-h-screen bg-cream text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 overflow-y-auto border-r border-line bg-paper p-5 md:block">
        <Link href="/admin" className="inline-flex items-center gap-2 font-serif text-2xl">
          <Mark className="h-5 w-8" />
          Silken Knot
        </Link>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-mute">Admin</p>

        <nav className="mt-8 space-y-6" aria-label="Admin">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-mute">{group.title}</p>
              <div className="mt-2 space-y-0.5">
                {group.items.map((item) => (
                  <AdminNavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="md:pl-64">
        <header className="border-b border-line px-4 md:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <p className="hidden text-sm text-mute md:block">Manage the Silken Knot store</p>
            <div className="ml-auto flex items-center gap-4 text-[11px] uppercase tracking-[0.16em]">
              <Link href="/">View store</Link>
              <button type="button" onClick={() => void store.logoutAdmin()}>
                Log out
              </button>
            </div>
          </div>
          <nav className="flex gap-6 overflow-x-auto pb-3 md:hidden" aria-label="Admin mobile">
            {navGroups.map((group) => (
              <div key={group.title} className="shrink-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-mute">{group.title}</p>
                <div className="mt-1 flex gap-3 text-sm">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={navItemActive(pathname, item.href) ? "font-medium text-ink" : "text-mute"}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </header>
        <div className="px-4 py-8 md:px-8">{children}</div>
      </div>
    </div>
  );
}
