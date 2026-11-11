"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Mark, Toast } from "@/components/ui";
import { AdminShellSkeleton } from "@/components/admin/AdminSkeletons";
import { useStore } from "@/lib/store";

/** Hover / focus tooltip for Studio action controls. Fixed so table overflow cannot clip it. */
export function AdminTip({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  function reveal(node: HTMLElement) {
    const box = node.getBoundingClientRect();
    setCoords({ x: box.left + box.width / 2, y: box.top });
    setOpen(true);
  }

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={(event) => reveal(event.currentTarget)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={(event) => {
        if (event.currentTarget.contains(event.target as Node)) reveal(event.currentTarget);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-[calc(100%+6px)] whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-paper shadow-sm"
          style={{ left: coords.x, top: coords.y }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

type NavItem = { label: string; href: string; hint: string };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Daily work",
    items: [
      { label: "Overview", href: "/admin", hint: "Numbers and shortcuts" },
      { label: "Orders", href: "/admin/orders", hint: "Pack, ship, track" },
      { label: "Products", href: "/admin/products", hint: "Name, price, stock, photos" },
      { label: "Customers", href: "/admin/customers", hint: "Accounts and past orders" },
    ],
  },
  {
    title: "Catalog",
    items: [
      { label: "Categories", href: "/admin/categories", hint: "Shop groups" },
      { label: "Discount codes", href: "/admin/offers", hint: "Checkout coupons" },
    ],
  },
  {
    title: "Website",
    items: [
      { label: "Homepage hero", href: "/admin/hero", hint: "Homepage slides" },
      { label: "Banners & Campaigns", href: "/admin/banners", hint: "Promo banners" },
      { label: "Website photos", href: "/admin/site-media", hint: "Page photos" },
      { label: "Logo", href: "/admin/brand", hint: "Brand mark" },
      { label: "Announcement", href: "/admin/announcements", hint: "Top bar" },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Account", href: "/admin/account", hint: "Password" },
      { label: "Shipping / Delivery", href: "/admin/shipping", hint: "Rates and courier" },
      { label: "Platform fee", href: "/admin/fees", hint: "Checkout fee" },
    ],
  },
];

const flatNavItems = navGroups.flatMap((group) => group.items);

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** Shared Studio control styles — cream/ink/line only. */
export const adminBtn = {
  primary: `inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-paper transition-colors duration-200 hover:bg-[#2a2420] ${focusRing} disabled:cursor-not-allowed disabled:opacity-60`,
  secondary: `inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-paper px-4 text-sm font-medium text-ink transition-colors duration-200 hover:bg-cream ${focusRing} disabled:cursor-not-allowed disabled:opacity-60`,
  ghost: `inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-mute transition-colors duration-200 hover:bg-cream hover:text-ink ${focusRing} disabled:cursor-not-allowed disabled:opacity-60`,
  danger: `inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#e8cfc9] bg-[#f6e4e1] px-4 text-sm font-medium text-[#8a3b32] transition-colors duration-200 hover:bg-[#f0d8d3] ${focusRing} disabled:cursor-not-allowed disabled:opacity-60`,
  row: `inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-line bg-paper px-2.5 text-xs font-medium text-ink transition-colors duration-200 hover:bg-cream ${focusRing}`,
  rowDanger: `inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#e8cfc9] bg-paper px-2.5 text-xs font-medium text-[#8a3b32] transition-colors duration-200 hover:bg-[#f6e4e1] ${focusRing}`,
} as const;

export const adminControl = {
  input: `h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-mute/70 focus:border-ink ${focusRing}`,
  select: `h-10 w-full cursor-pointer rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors duration-200 focus:border-ink ${focusRing}`,
  textarea: `min-h-24 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-mute/70 focus:border-ink ${focusRing}`,
  label: "block text-sm font-medium text-ink",
  hint: "mt-1.5 text-xs leading-5 text-mute",
} as const;

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
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-[1.75rem]">{title}</h1>
        <p className="mt-1.5 text-sm leading-6 text-mute">{purpose}</p>
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
    <section className="overflow-hidden rounded-xl border border-line bg-paper">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-cream/70 ${focusRing}`}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{title}</p>
          {hint ? <p className="mt-0.5 text-xs leading-5 text-mute">{hint}</p> : null}
        </div>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={`shrink-0 text-mute transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? <div className="space-y-4 border-t border-line px-4 py-4">{children}</div> : null}
    </section>
  );
}

export function AdminField({
  label,
  hint,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`${adminControl.label} ${className}`} htmlFor={htmlFor}>
      {label}
      <div className="mt-1.5">{children}</div>
      {hint ? <p className={adminControl.hint}>{hint}</p> : null}
    </label>
  );
}

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${adminControl.input} ${className}`} />;
}

export function AdminSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return <select {...rest} className={`${adminControl.select} ${className}`} />;
}

export function AdminTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea {...rest} className={`${adminControl.textarea} ${className}`} />;
}

/** Sticky bottom action bar for long editors. */
export function AdminStickyActions({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {note ? <p className="text-xs text-mute">{note}</p> : <span />}
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

export function AdminEmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-paper/60 px-6 py-14 text-center">
      {icon ? <div className="mx-auto flex justify-center text-mute">{icon}</div> : null}
      <p className={`text-lg font-semibold text-ink ${icon ? "mt-3" : ""}`}>{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-mute">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AdminFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-paper p-3.5">{children}</div>
  );
}

export function AdminStatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-4 py-3.5">
      <p className="text-xs font-medium text-mute">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
    </div>
  );
}

function AdminNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = navItemActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      title={item.hint}
      className={`block rounded-lg px-2.5 py-2 transition-colors duration-200 ${focusRing} ${
        active ? "bg-cream font-medium text-ink" : "text-mute hover:bg-cream/60 hover:text-ink"
      }`}
    >
      <span className="block text-sm">{item.label}</span>
    </Link>
  );
}

function MobileNavJump({ pathname }: { pathname: string }) {
  const router = useRouter();
  const current = useMemo(() => {
    const match = flatNavItems.find((item) => navItemActive(pathname, item.href));
    return match?.href || "/admin";
  }, [pathname]);

  return (
    <label className="block pb-3 md:hidden">
      <span className="text-xs font-medium text-mute">Go to</span>
      <select
        value={current}
        onChange={(event) => router.push(event.target.value)}
        className={`mt-1.5 ${adminControl.select}`}
        aria-label="Jump to studio page"
      >
        {navGroups.map((group) => (
          <optgroup key={group.title} label={group.title}>
            {group.items.map((item) => (
              <option key={item.href} value={item.href}>
                {item.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
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

  if (login) {
    if (store.ready && store.adminAuthed) return null;
    return <div className="min-h-screen bg-cream">{children}</div>;
  }

  if (!store.ready) return <AdminShellSkeleton />;
  if (!store.adminAuthed) return null;

  return (
    <div className="min-h-screen bg-cream text-ink">
      <a
        href="#studio-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Skip to main content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-56 overflow-y-auto border-r border-line bg-paper px-3 py-5 md:block">
        <Link href="/admin" aria-label="Studio home" className={`ml-1 inline-flex items-center ${focusRing}`}>
          <Mark className="h-12 w-32" />
        </Link>
        <p className="ml-2.5 mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-mute">Studio</p>

        <nav className="mt-6 space-y-5" aria-label="Admin">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-mute">{group.title}</p>
              <div className="mt-1 space-y-0.5">
                {group.items.map((item) => (
                  <AdminNavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="md:pl-56">
        <header className="sticky top-0 z-30 border-b border-line bg-cream/90 px-4 backdrop-blur md:px-8">
          <div className="flex h-12 items-center justify-between gap-4">
            <p className="hidden text-sm text-mute md:block">Silken Knot studio</p>
            <div className="ml-auto flex items-center gap-1.5">
              <AdminTip label="Open the live shop">
                <Link href="/" className={adminBtn.ghost}>
                  View store
                </Link>
              </AdminTip>
              <AdminTip label="Log out of studio">
                <button type="button" onClick={() => void store.logoutAdmin()} className={adminBtn.secondary}>
                  Log out
                </button>
              </AdminTip>
            </div>
          </div>
          <MobileNavJump pathname={pathname} />
        </header>
        <main id="studio-main" className="px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
      <Toast message={store.toast?.message ?? null} tone={store.toast?.tone ?? "default"} />
    </div>
  );
}
