"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { formatDate, formatPrice, slugify } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Category, Coupon, Order, OrderStatus, Product, Variant } from "@/lib/types";
import type { HeroEvergreenSlide, HeroOffer } from "@/lib/hero/content";
import { DEFAULT_HERO_CONTENT, DEFAULT_HERO_OFFER } from "@/lib/hero/content";
import type { BrandSettings } from "@/lib/brand/content";
import { DEFAULT_BRAND } from "@/lib/brand/content";
import { primeBrandCache } from "@/lib/brand/client";
import type { SiteMediaReview, SiteMediaSettings, SiteMediaStripItem } from "@/lib/site-media/content";
import { DEFAULT_SITE_MEDIA, SITE_MEDIA_SLOTS } from "@/lib/site-media/content";
import { primeSiteMediaCache } from "@/lib/site-media/client";
function linesToList(value: string) {
  return value.split("\n").map((item) => item.trimEnd());
}
import { Mark, Media } from "@/components/ui";
import { csrfHeaders } from "@/lib/auth/browser";

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
      { label: "Website photos", href: "/admin/site-media", hint: "Banners, strip, login, checkout" },
      { label: "Logo", href: "/admin/brand", hint: "Mark in header and checkout" },
      { label: "Top banner", href: "/admin/announcements", hint: "Rotating bar at the top" },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Account", href: "/admin/account", hint: "Studio password" },
      { label: "Shipping", href: "/admin/shipping", hint: "Rates, Delhivery, COD" },
      { label: "Payment fees", href: "/admin/fees", hint: "Checkout platform fee" },
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

async function uploadAdminImage(file: File, fields: Record<string, string>) {
  const body = new FormData();
  body.append("file", file);
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  const response = await fetch("/api/admin/media", { method: "POST", headers: csrfHeaders(false), body });
  const payload = (await response.json()) as { url?: string; message?: string };
  if (!response.ok || !payload.url) throw new Error(payload.message || "Could not upload that image.");
  return payload.url;
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

  if (!store.ready) return <p className="p-10 text-mute">Opening admin…</p>;
  if (login) return <div className="min-h-screen bg-cream">{children}</div>;
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

type LoginStep = "credentials" | "channel" | "code" | "forgot" | "forgot-code";

export function AdminLogin() {
  const store = useStore();
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [ticketToken, setTicketToken] = useState("");
  const [channels, setChannels] = useState<{ channel: "email" | "whatsapp"; masked: string }[]>([]);
  const [channel, setChannel] = useState<"email" | "whatsapp" | null>(null);
  const [challengeId, setChallengeId] = useState("");
  const [masked, setMasked] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function startMfa(nextChannel: "email" | "whatsapp", nextTicketId = ticketId, nextTicketToken = ticketToken) {
    const sent = await store.sendAdminMfa({ ticketId: nextTicketId, ticketToken: nextTicketToken, channel: nextChannel });
    if (!sent.ok || !sent.challengeId) {
      setError(sent.message || "We couldn’t send a code.");
      return false;
    }
    setChannel(nextChannel);
    setChallengeId(sent.challengeId);
    setMasked(sent.masked || "");
    setDevCode(sent.devCode || "");
    setCode("");
    setStep("code");
    return true;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <p className="eyebrow text-mute">Studio</p>
      <h1 className="mt-3 font-serif text-6xl">
        {step === "forgot" || step === "forgot-code" ? "Reset access" : step === "code" || step === "channel" ? "Verify" : "Log in"}
      </h1>
      <p className="mt-3 text-sm text-mute">
        {step === "credentials"
          ? "Sign in, then confirm with a one-time code sent to your email or phone."
          : step === "channel"
            ? "Choose where to receive your verification code."
            : step === "code"
              ? `Enter the code sent to ${masked || "your contact"}.`
              : step === "forgot"
                ? "We’ll email a code if that studio account exists. Credentials are never shown here."
                : `Enter the code${masked ? ` sent to ${masked}` : ""} and choose a new password.`}
      </p>

      {step === "credentials" ? (
        <form
          className="mt-10"
          autoComplete="off"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            setMessage("");
            const result = await store.loginAdmin(email, password);
            setBusy(false);
            if (!result.ok) {
              setError(result.message || "Those studio details are not recognised.");
              return;
            }
            setPassword("");
            setTicketId(result.ticketId || "");
            setTicketToken(result.ticketToken || "");
            setChannels(result.channels || []);
            if ((result.channels || []).length === 1) {
              setBusy(true);
              const ok = await startMfa(result.channels![0].channel, result.ticketId, result.ticketToken);
              setBusy(false);
              if (!ok) setStep("channel");
              return;
            }
            setStep("channel");
          }}
        >
          <label className="text-sm">
            Email
            <input
              type="email"
              name="studio-email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-12 w-full border-b border-line bg-transparent outline-none"
            />
          </label>
          <label className="mt-6 block text-sm">
            Password
            <input
              type="password"
              name="studio-password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 w-full border-b border-line bg-transparent outline-none"
            />
          </label>
          {error ? <p role="alert" className="mt-4 text-sm">{error}</p> : null}
          <button type="submit" disabled={busy} className="mt-8 h-12 w-full bg-ink text-[11px] uppercase tracking-[0.2em] text-paper disabled:opacity-60">
            Continue
          </button>
          <button
            type="button"
            className="mt-4 text-sm text-mute underline"
            onClick={() => {
              setError("");
              setMessage("");
              setStep("forgot");
            }}
          >
            Forgot password
          </button>
        </form>
      ) : null}

      {step === "channel" ? (
        <div className="mt-10 space-y-3">
          {channels.map((item) => (
            <button
              key={item.channel}
              type="button"
              disabled={busy}
              className="flex h-14 w-full items-center justify-between border border-line px-4 text-left text-sm disabled:opacity-60"
              onClick={async () => {
                setBusy(true);
                setError("");
                await startMfa(item.channel);
                setBusy(false);
              }}
            >
              <span>{item.channel === "email" ? "Email" : "WhatsApp"}</span>
              <span className="text-mute">{item.masked}</span>
            </button>
          ))}
          {error ? <p role="alert" className="text-sm">{error}</p> : null}
          <button type="button" className="pt-2 text-sm text-mute underline" onClick={() => setStep("credentials")}>
            Back
          </button>
        </div>
      ) : null}

      {step === "code" ? (
        <form
          className="mt-10"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            const result = await store.verifyAdminMfa({ ticketId, ticketToken, challengeId, code });
            setBusy(false);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            router.push("/admin");
          }}
        >
          <label className="text-sm">
            6-digit code
            <input
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-2 h-12 w-full border-b border-line bg-transparent tracking-[0.3em] outline-none"
            />
          </label>
          {devCode ? <p className="mt-3 text-xs text-mute">Dev code: {devCode}</p> : null}
          {error ? <p role="alert" className="mt-4 text-sm">{error}</p> : null}
          <button type="submit" disabled={busy || code.length !== 6} className="mt-8 h-12 w-full bg-ink text-[11px] uppercase tracking-[0.2em] text-paper disabled:opacity-60">
            Verify and enter
          </button>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-mute">
            <button
              type="button"
              disabled={busy || !channel}
              className="underline disabled:opacity-50"
              onClick={async () => {
                if (!channel) return;
                setBusy(true);
                setError("");
                await startMfa(channel);
                setBusy(false);
              }}
            >
              Resend code
            </button>
            {channels.length > 1 ? (
              <button type="button" className="underline" onClick={() => setStep("channel")}>
                Use another channel
              </button>
            ) : null}
            <button type="button" className="underline" onClick={() => setStep("credentials")}>
              Back
            </button>
          </div>
        </form>
      ) : null}

      {step === "forgot" ? (
        <form
          className="mt-10"
          autoComplete="off"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            setMessage("");
            const result = await store.requestAdminPasswordReset(email);
            setBusy(false);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            setMessage(result.message || "");
            if (result.ticketId && result.ticketToken && result.challengeId) {
              setTicketId(result.ticketId);
              setTicketToken(result.ticketToken);
              setChallengeId(result.challengeId);
              setMasked(result.masked || "");
              setDevCode(result.devCode || "");
              setStep("forgot-code");
              return;
            }
            setMessage(result.message || "If that studio account exists, a verification code is on its way.");
          }}
        >
          <label className="text-sm">
            Studio email
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-12 w-full border-b border-line bg-transparent outline-none"
            />
          </label>
          {error ? <p role="alert" className="mt-4 text-sm">{error}</p> : null}
          {message ? <p className="mt-4 text-sm text-mute">{message}</p> : null}
          <button type="submit" disabled={busy} className="mt-8 h-12 w-full bg-ink text-[11px] uppercase tracking-[0.2em] text-paper disabled:opacity-60">
            Send code
          </button>
          <button type="button" className="mt-4 text-sm text-mute underline" onClick={() => setStep("credentials")}>
            Back to sign in
          </button>
        </form>
      ) : null}

      {step === "forgot-code" ? (
        <form
          className="mt-10"
          autoComplete="off"
          onSubmit={async (event) => {
            event.preventDefault();
            if (newPassword !== confirmPassword) {
              setError("Those passwords do not match.");
              return;
            }
            setBusy(true);
            setError("");
            const result = await store.confirmAdminPasswordReset({
              ticketId,
              ticketToken,
              challengeId,
              code,
              password: newPassword,
            });
            setBusy(false);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            setPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setCode("");
            setMessage(result.message || "Password updated. Sign in with your new password.");
            setStep("credentials");
          }}
        >
          <label className="text-sm">
            6-digit code
            <input
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-2 h-12 w-full border-b border-line bg-transparent tracking-[0.3em] outline-none"
            />
          </label>
          <label className="mt-6 block text-sm">
            New password
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-2 h-12 w-full border-b border-line bg-transparent outline-none"
            />
          </label>
          <label className="mt-6 block text-sm">
            Confirm password
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 h-12 w-full border-b border-line bg-transparent outline-none"
            />
          </label>
          {devCode ? <p className="mt-3 text-xs text-mute">Dev code: {devCode}</p> : null}
          {error ? <p role="alert" className="mt-4 text-sm">{error}</p> : null}
          <button type="submit" disabled={busy || code.length !== 6} className="mt-8 h-12 w-full bg-ink text-[11px] uppercase tracking-[0.2em] text-paper disabled:opacity-60">
            Update password
          </button>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-mute">
            <button
              type="button"
              disabled={busy}
              className="underline disabled:opacity-50"
              onClick={async () => {
                setBusy(true);
                setError("");
                const resent = await store.resendAdminPasswordReset({ ticketId, ticketToken });
                setBusy(false);
                if (!resent.ok || !resent.challengeId) {
                  setError(resent.message || "Could not resend the code.");
                  return;
                }
                setChallengeId(resent.challengeId);
                setMasked(resent.masked || masked);
                setDevCode(resent.devCode || "");
              }}
            >
              Resend code
            </button>
            <button type="button" className="underline" onClick={() => setStep("credentials")}>
              Back to sign in
            </button>
          </div>
        </form>
      ) : null}

      {step === "credentials" && message ? <p className="mt-4 text-sm text-mute">{message}</p> : null}
    </div>
  );
}

const commonTasks = [
  { href: "/admin/orders", title: "Fulfill orders", hint: "See new orders, update status, and ship." },
  { href: "/admin/products", title: "Add or edit products", hint: "Names, prices, stock, and product photos." },
  { href: "/admin/hero", title: "Change homepage hero", hint: "Sale campaign slide and product slides." },
  { href: "/admin/site-media", title: "Replace website photos", hint: "Collection tiles, shop banners, login, checkout." },
  { href: "/admin/offers", title: "Create a discount code", hint: "Coupons customers enter at checkout." },
  { href: "/admin/shipping", title: "Update shipping", hint: "Delivery rates, free shipping, and Delhivery." },
];

export function Dashboard() {
  const store = useStore();
  const revenue = store.orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.total, 0);
  const low = store.products.filter((product) => product.variants.some((variant) => variant.stock < 8));
  const stats = [
    [store.products.length, "Products"],
    [store.orders.length, "Orders"],
    [store.users.filter((user) => user.role === "customer").length, "Customers"],
    [formatPrice(revenue), "Revenue"],
  ];
  return (
    <div>
      <AdminPageHeader
        title="Overview"
        purpose="Start here. Check the numbers below, then use a common task when you know what you need to change."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className="bg-paper p-6">
            <p className="font-serif text-4xl">{value}</p>
            <p className="mt-2 eyebrow text-mute">{label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-serif text-3xl">Common tasks</h2>
      <p className="mt-2 text-sm text-mute">Pick the job you need — each link opens the right admin page.</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {commonTasks.map((task) => (
          <li key={task.href}>
            <Link href={task.href} className="block h-full bg-paper p-5 transition-colors hover:bg-white">
              <p className="font-medium">{task.title}</p>
              <p className="mt-2 text-sm text-mute">{task.hint}</p>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 font-serif text-3xl">Needs attention</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {low.map((product) => (
          <li key={product.id}>
            <Link href={`/admin/products/${product.id}`} className="underline-offset-2 hover:underline">
              {product.name}
            </Link>{" "}
            is low in stock.
          </li>
        ))}
        {low.length === 0 ? <li className="text-mute">Stock looks comfortable.</li> : null}
      </ul>
    </div>
  );
}

export function ProductIndex() {
  const store = useStore();
  return (
    <div>
      <AdminPageHeader
        title="Products"
        purpose="Use this to add or edit items customers buy — name, price, stock, and product photos. Changes show on the shop after you save."
        action={
          <Link href="/admin/products/new" className="inline-flex h-11 items-center bg-ink px-4 text-[11px] uppercase tracking-[0.16em] text-paper">
            Add product
          </Link>
        }
      />
      <ul className="mt-8 divide-y divide-line">
        {store.products.map((product) => (
          <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <Link href={`/admin/products/${product.id}`} className="font-serif text-2xl">{product.name}</Link>
              <p className="text-sm text-mute">{product.type} · {formatPrice(product.price)} · {product.active ? "Active" : "Hidden"}</p>
            </div>
            <Link href={`/admin/products/${product.id}`} className="text-[11px] uppercase tracking-[0.16em]">Edit</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductEditor({ id }: { id?: string }) {
  const store = useStore();
  const existing = id ? store.productById(id) : undefined;
  if (id && store.ready && !existing) return <p>Product not found.</p>;
  if (!store.ready) return <p>Loading…</p>;
  return <ProductForm initial={existing} />;
}

function blankProduct(): Product {
  // Stable id before first save so Bunny paths can use products/{id}/… immediately.
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `p-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`
      : `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    slug: "",
    name: "",
    categoryId: "body-care",
    type: "Body Butter",
    scent: "",
    price: 0,
    rating: 5,
    reviewCount: 0,
    shortDescription: "",
    description: "",
    benefits: [""],
    ingredients: [""],
    howToUse: [""],
    showDescription: true,
    showIngredients: false,
    showHowToUse: false,
    showBenefits: false,
    images: [],
    variants: [{ id: "standard", label: "Standard", price: 0, stock: 0 }],
    featured: false,
    bestseller: false,
    newArrival: false,
    active: true,
    weightGrams: 200,
    createdAt: new Date().toISOString(),
    reviews: [],
    faqs: [],
  };
}

function ProductForm({ initial }: { initial?: Product }) {
  const store = useStore();
  const router = useRouter();
  const [product, setProduct] = useState<Product>(initial ?? blankProduct());
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  /** CDN URLs removed in the editor — deleted only after a successful product save. */
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

  const set = <K extends keyof Product>(key: K, value: Product[K]) => setProduct((current) => ({ ...current, [key]: value }));

  const onFiles = async (files: FileList | null) => {
    if (!files?.length || uploading) return;
    if (!product.id) {
      setError("Save a product id before uploading images.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of [...files]) {
        const prepared = await compress(file);
        const body = new FormData();
        body.append("file", prepared, "product.webp");
        body.append("productId", product.id);
        body.append("role", product.images.length + urls.length === 0 ? "main" : "gallery");
        const response = await fetch("/api/admin/media", {
          method: "POST",
          headers: csrfHeaders(false),
          body,
        });
        const payload = await response.json() as { url?: string; message?: string };
        if (!response.ok || !payload.url) throw new Error(payload.message || "Could not upload that image.");
        urls.push(payload.url);
      }
      setProduct((current) => ({ ...current, images: [...current.images, ...urls] }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const src = product.images[index];
    set("images", product.images.filter((_, item) => item !== index));
    if (!src || src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) return;
    setPendingDeletes((current) => (current.includes(src) ? current : [...current, src]));
  };

  return (
    <form
      className="mx-auto max-w-3xl space-y-10"
      onSubmit={async (event) => {
        event.preventDefault();
        const nextImages = product.images;
        const result = await store.saveProduct(
          {
            ...product,
            benefits: product.benefits.map((item) => item.trim()).filter(Boolean),
            ingredients: product.ingredients.map((item) => item.trim()).filter(Boolean),
            howToUse: product.howToUse.map((item) => item.trim()).filter(Boolean),
            slug: slugify(product.slug || product.name),
          },
          !initial,
        );
        if (!result.ok) return setError(result.message);
        // Delete CDN objects only after DB save succeeds and the URL is no longer on this product.
        const toDelete = pendingDeletes.filter((url) => !nextImages.includes(url));
        for (const url of toDelete) {
          try {
            await fetch("/api/admin/media", {
              method: "DELETE",
              headers: { ...csrfHeaders(), "Content-Type": "application/json" },
              body: JSON.stringify({ url }),
            });
          } catch {
            // Orphan cleanup can retry later; product record is already correct.
          }
        }
        setPendingDeletes([]);
        router.push("/admin/products");
      }}
    >
      <AdminPageHeader
        title={initial ? "Edit product" : "New product"}
        purpose="Fill in the details customers see on the product page. Upload photos here — these are the product gallery, not the homepage marketing images."
      />
      <section className="mt-8 space-y-5 bg-paper p-6">
        <p className="eyebrow text-mute">Product information</p>
        <AdminField label="Product name" value={product.name} onChange={(value) => set("name", value)} />
        <label className="block text-sm">
          Category
          <select value={product.categoryId} onChange={(event) => set("categoryId", event.target.value)} className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none">
            {store.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <AdminField label="Type" value={product.type} onChange={(value) => set("type", value)} />
        <AdminField label="Scent" value={product.scent} onChange={(value) => set("scent", value)} />
        <label className="block text-sm">
          Approximate weight (grams)
          <input
            type="number"
            min={1}
            max={30000}
            value={product.weightGrams || ""}
            onChange={(event) => set("weightGrams", Math.round(Number(event.target.value) || 0))}
            className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none"
          />
          <span className="mt-2 block text-xs text-mute">Used to estimate the parcel for this product. Shoppers do not see it. The shipment uses the total of the items in the order.</span>
        </label>
        <label className="block text-sm">
          Short description
          <textarea value={product.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} className="mt-2 min-h-20 w-full border-b border-line bg-transparent outline-none" />
        </label>
      </section>
      <section className="space-y-4 bg-paper p-6">
        <p className="eyebrow text-mute">Detail sections (optional)</p>
        <p className="text-xs text-mute">Check a section to show it on the product page, then author the copy. One item per line for lists.</p>
        {([
          ["showDescription", "Show description", "description"] as const,
          ["showBenefits", "Show benefits", "benefits"] as const,
          ["showIngredients", "Show ingredients", "ingredients"] as const,
          ["showHowToUse", "Show how to use", "howToUse"] as const,
        ]).map(([flag, label, field]) => {
          const hasList = field === "benefits" || field === "ingredients" || field === "howToUse";
          const enabled =
            product[flag] ??
            (field === "description"
              ? Boolean(product.description.trim())
              : product[field].some((item) => item.trim()));
          return (
            <div key={flag} className="space-y-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={enabled} onChange={(event) => set(flag, event.target.checked)} />
                {label}
              </label>
              {enabled ? (
                <label className="block text-sm">
                  {field === "description"
                    ? "Description"
                    : field === "benefits"
                      ? "Benefits (one per line)"
                      : field === "ingredients"
                        ? "Ingredients (one per line)"
                        : "How to use (one step per line)"}
                  <textarea
                    value={hasList ? product[field].join("\n") : product.description}
                    onChange={(event) => {
                      if (hasList) set(field, linesToList(event.target.value));
                      else set("description", event.target.value);
                    }}
                    className="mt-2 min-h-24 w-full border-b border-line bg-transparent outline-none"
                  />
                </label>
              ) : null}
            </div>
          );
        })}
      </section>
      <section className="bg-paper p-6">
        <p className="eyebrow text-mute">Media</p>
        <label
          className="mt-4 flex min-h-32 cursor-pointer items-center justify-center border border-dashed border-stone text-sm text-mute"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void onFiles(event.dataTransfer.files);
          }}
        >
          {uploading ? "Uploading to the image host…" : "Drop images or browse"}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} className="sr-only" onChange={(event) => void onFiles(event.target.files)} />
        </label>
        <div className="mt-3 flex gap-2">
          <input id="image-url" placeholder="Or paste an image URL" className="h-11 flex-1 border-b border-line bg-transparent outline-none" />
          <button
            type="button"
            className="text-[11px] uppercase tracking-[0.16em]"
            onClick={() => {
              const input = document.getElementById("image-url") as HTMLInputElement;
              const value = input.value.trim();
              if (!value) return;
              if (value.startsWith("data:") || value.startsWith("blob:")) {
                setError("Browse a photo to upload it, or paste a public image address.");
                return;
              }
              set("images", [...product.images, value]);
              input.value = "";
            }}
          >
            Add URL
          </button>
        </div>
        <ul className="mt-4 flex flex-wrap gap-3">
          {product.images.map((src, index) => (
            <li
              key={`${src}-${index}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex === null || dragIndex === index) return;
                const images = [...product.images];
                const [moved] = images.splice(dragIndex, 1);
                images.splice(index, 0, moved);
                set("images", images);
                setDragIndex(null);
              }}
              className="w-24"
            >
              <span className="relative block aspect-[4/5] bg-cream">
                <Media src={src} alt="" sizes="96px" />
              </span>
              <button type="button" className="mt-1 text-[11px] uppercase tracking-[0.14em]" onClick={() => void removeImage(index)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-4 bg-paper p-6">
        <p className="eyebrow text-mute">Pricing & inventory</p>
        {product.variants.map((variant, index) => (
          <div key={variant.id} className="grid gap-3 border-t border-line pt-4 md:grid-cols-4">
            <AdminField label="Option" value={variant.label} onChange={(value) => updateVariant(product, setProduct, index, { label: value })} />
            <AdminField label="Price" value={String(variant.price || "")} onChange={(value) => updateVariant(product, setProduct, index, { price: Number(value) || 0 })} />
            <AdminField label="Sale compare" value={variant.compareAtPrice ? String(variant.compareAtPrice) : ""} onChange={(value) => updateVariant(product, setProduct, index, { compareAtPrice: value ? Number(value) : undefined })} />
            <AdminField label="Stock" value={String(variant.stock)} onChange={(value) => updateVariant(product, setProduct, index, { stock: Number(value) || 0 })} />
          </div>
        ))}
        <button
          type="button"
          className="text-[11px] uppercase tracking-[0.16em]"
          onClick={() => set("variants", [...product.variants, { id: `opt-${Date.now()}`, label: "", price: product.price || 0, stock: 0 }])}
        >
          Add option
        </button>
      </section>
      <section className="bg-paper p-6">
        <p className="eyebrow text-mute">Options</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {([
            ["featured", "Featured"],
            ["bestseller", "Bestseller"],
            ["newArrival", "New arrival"],
            ["active", "Active"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={product[key]} onChange={(event) => set(key, event.target.checked)} />
              {label}
            </label>
          ))}
        </div>
      </section>
      {error ? <p role="alert">{error}</p> : null}
      <div className="flex gap-4">
        <button type="submit" className="h-12 bg-ink px-8 text-[11px] uppercase tracking-[0.2em] text-paper">Save product</button>
        {initial ? (
          <button
            type="button"
            className="text-[11px] uppercase tracking-[0.16em]"
            onClick={async () => {
              await store.deleteProduct(initial.id);
              router.push("/admin/products");
            }}
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}

function updateVariant(product: Product, setProduct: (value: Product) => void, index: number, patch: Partial<Variant>) {
  setProduct({
    ...product,
    variants: product.variants.map((variant, item) => (item === index ? { ...variant, ...patch } : variant)),
  });
}

function AdminField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label htmlFor={id} className="block text-sm">
      {label}
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none" />
    </label>
  );
}

async function compress(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare that image.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
  if (!blob) throw new Error("Could not prepare that image.");
  return blob;
}

export function CategoryManager() {
  const store = useStore();
  const [draft, setDraft] = useState<Category>({ id: "", name: "", description: "", image: "", imageAlt: "", order: store.categories.length });
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<"image" | "imageAlt" | null>(null);

  const onUpload = async (files: FileList | null, field: "image" | "imageAlt") => {
    const file = files?.[0];
    if (!file || uploading) return;
    const categoryId = slugify(draft.id || draft.name);
    if (!categoryId) {
      setError("Set a name or slug before uploading images.");
      return;
    }
    setUploading(field);
    setError("");
    try {
      const url = await uploadAdminImage(file, { role: "category", categoryId });
      setDraft((current) => ({ ...current, id: categoryId, [field]: url }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not upload that image.");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Categories"
        purpose="Shop groups like Body Care or Candles. Images here are used in search and as a fallback in the header menu. Homepage collection tiles and the circular category strip are under Website photos."
      />
      <ul className="mt-8 space-y-4">
        {store.categories.map((category, index) => (
          <li key={category.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
            <div className="flex items-center gap-4">
              {category.image ? (
                <span className="relative block size-14 overflow-hidden rounded-lg bg-paper">
                  <Media src={category.image} alt="" sizes="56px" className="object-cover" />
                </span>
              ) : null}
              <div>
                <p className="font-serif text-2xl">{category.name}</p>
                <p className="text-sm text-mute">{category.description}</p>
              </div>
            </div>
            <div className="flex gap-3 text-[11px] uppercase tracking-[0.16em]">
              <button type="button" onClick={() => store.moveCategory(category.id, -1)} disabled={index === 0}>Up</button>
              <button type="button" onClick={() => store.moveCategory(category.id, 1)} disabled={index === store.categories.length - 1}>Down</button>
              <button type="button" onClick={() => setDraft(category)}>Edit</button>
              <button type="button" onClick={async () => setError((await store.deleteCategory(category.id)).message || "")}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-8 max-w-xl space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const isNew = !store.categories.some((category) => category.id === draft.id);
          const result = await store.saveCategory({ ...draft, id: slugify(draft.id || draft.name), order: draft.order ?? store.categories.length }, isNew);
          setError(result.message || "");
          if (result.ok) setDraft({ id: "", name: "", description: "", image: "", imageAlt: "", order: store.categories.length + 1 });
        }}
      >
        <AdminField label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
        <AdminField label="Slug" value={draft.id} onChange={(id) => setDraft({ ...draft, id })} />
        <AdminField label="Description" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
        <AdminField label="Image URL" value={draft.image} onChange={(image) => setDraft({ ...draft, image })} />
        <label className="block text-sm">
          Upload primary image
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} className="mt-2 block w-full text-sm" onChange={(event) => void onUpload(event.target.files, "image")} />
          <span className="mt-1 block text-xs text-mute">{uploading === "image" ? "Uploading…" : "JPEG, PNG, or WebP under 6 MB."}</span>
        </label>
        {draft.image ? (
          <div className="relative h-28 w-full max-w-xs overflow-hidden rounded-lg border border-line bg-paper">
            <Media src={draft.image} alt="" className="object-cover" sizes="320px" />
          </div>
        ) : null}
        <AdminField label="Second image URL" value={draft.imageAlt} onChange={(imageAlt) => setDraft({ ...draft, imageAlt })} />
        <label className="block text-sm">
          Upload second image
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} className="mt-2 block w-full text-sm" onChange={(event) => void onUpload(event.target.files, "imageAlt")} />
          <span className="mt-1 block text-xs text-mute">{uploading === "imageAlt" ? "Uploading…" : "JPEG, PNG, or WebP under 6 MB."}</span>
        </label>
        {error ? <p role="status" className="text-sm">{error}</p> : null}
        <button type="submit" className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper">Save category</button>
      </form>
    </div>
  );
}

export function OrderIndex() {
  const store = useStore();
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [shipment, setShipment] = useState("all");
  const [query, setQuery] = useState("");
  const orders = store.orders.filter((order) => {
    if (status !== "all" && order.status !== status) return false;
    if (payment !== "all" && order.paymentState !== payment) return false;
    if (shipment !== "all" && (order.shipment?.state || "not_created") !== shipment) return false;
    const haystack = `${order.number} ${order.customerName} ${order.email}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  return (
    <div>
      <AdminPageHeader
        title="Orders"
        purpose="Use this when a customer has placed an order. Open an order to update status, payment, or shipping."
      />
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <label className="text-sm">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="ml-3 h-10 border-b border-line bg-transparent">
            {["all", "pending_payment", "confirmed", "shipped", "delivered", "cancelled"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Payment
          <select value={payment} onChange={(event) => setPayment(event.target.value)} className="ml-3 h-10 border-b border-line bg-transparent">
            {["all", "pending", "captured", "failed", "refund_pending", "refunded"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Shipment
          <select value={shipment} onChange={(event) => setShipment(event.target.value)} className="ml-3 h-10 border-b border-line bg-transparent">
            {["all", "not_created", "pending", "booked", "in_transit", "delivered", "exception", "unknown"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search orders" className="h-10 border-b border-line bg-transparent" />
      </div>
      <ul className="mt-8 divide-y divide-line">
        {orders.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <Link href={`/admin/orders/${order.id}`} className="font-serif text-2xl">{order.number}</Link>
              <p className="text-sm text-mute">{order.customerName} · {formatDate(order.createdAt)} · {formatPrice(order.total)}</p>
            </div>
            <span className="text-[11px] uppercase tracking-[0.16em]">{order.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrderDetail({ id }: { id: string }) {
  const store = useStore();
  const order = store.orders.find((item) => item.id === id);
  if (!order) return <p>Order not found.</p>;
  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title={order.number}
        purpose={`${order.customerName} · ${order.email} · ${order.phone}. Update status below, or book shipping when ready.`}
      />
      {order.paymentState ? <p className="mt-2 text-sm">Payment {order.paymentState} · Fulfilment {order.fulfillmentState || "unfulfilled"}</p> : null}
      <p className="mt-2">{order.address.line1}, {order.address.city} {order.address.postal}</p>
      <label className="mt-6 block text-sm">
        Status
        <select
          value={order.status}
          disabled={Boolean(order.shipment?.awb)}
          onChange={(event) => store.updateOrderStatus(order.id, event.target.value as OrderStatus)}
          className="mt-2 h-11 w-full max-w-xs border-b border-line bg-transparent disabled:opacity-60"
        >
          {["pending_payment", "placed", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((status) => <option key={status}>{status}</option>)}
        </select>
      </label>
      {order.shipment?.awb ? <p className="mt-2 text-sm text-mute">This order has a waybill. Delivery status follows Delhivery.</p> : null}
      <ul className="mt-8 space-y-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between border-b border-line py-3">
            <span>{item.name} · {item.variantLabel} × {item.quantity}</span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-right font-serif text-3xl">{formatPrice(order.total)}</p>
      <FulfilmentPanel orderId={order.id} initial={order} />
    </div>
  );
}

export function CustomerIndex() {
  const store = useStore();
  const customers = store.users.filter((user) => user.role === "customer");
  return (
    <div>
      <AdminPageHeader
        title="Customers"
        purpose="People who have signed in or placed orders. Open a customer to see addresses and their order history."
      />
      <ul className="mt-8 divide-y divide-line">
        {customers.map((customer) => (
          <li key={customer.id} className="flex items-center justify-between py-4">
            <div>
              <Link href={`/admin/customers/${customer.id}`} className="font-serif text-2xl">{customer.name}</Link>
              <p className="text-sm text-mute">{customer.email}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CustomerDetail({ id }: { id: string }) {
  const store = useStore();
  const customer = store.users.find((user) => user.id === id);
  if (!customer) return <p>Customer not found.</p>;
  const orders = store.orders.filter((order) => order.userId === customer.id || order.email === customer.email);
  return (
    <div>
      <AdminPageHeader
        title={customer.name}
        purpose={`${customer.email} · ${customer.phone || "No phone"}`}
      />
      <h2 className="mt-10 font-serif text-3xl">Addresses</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {customer.addresses.map((address) => <li key={address.id}>{address.line1}, {address.city} {address.postal}</li>)}
      </ul>
      <h2 className="mt-10 font-serif text-3xl">Orders</h2>
      <ul className="mt-3 space-y-2">
        {orders.map((order) => (
          <li key={order.id}><Link href={`/admin/orders/${order.id}`}>{order.number}</Link> · {order.status} · {formatPrice(order.total)}</li>
        ))}
      </ul>
    </div>
  );
}

export function HeroManager() {
  const [draft, setDraft] = useState<HeroOffer>(DEFAULT_HERO_OFFER);
  const [evergreen, setEvergreen] = useState<HeroEvergreenSlide[]>(DEFAULT_HERO_CONTENT.evergreen);
  const [chipsText, setChipsText] = useState(DEFAULT_HERO_OFFER.chips.join(", "));
  const [evergreenChips, setEvergreenChips] = useState(DEFAULT_HERO_CONTENT.evergreen.map((slide) => slide.chips.join(", ")));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/admin/hero", { headers: csrfHeaders() });
        const data = (await response.json()) as {
          ok?: boolean;
          offer?: HeroOffer;
          evergreen?: HeroEvergreenSlide[];
          error?: string;
        };
        if (!response.ok || !data.offer) throw new Error(data.error || "Could not load the hero.");
        if (cancelled) return;
        setDraft(data.offer);
        setChipsText(data.offer.chips.join(", "));
        const slides = data.evergreen?.length ? data.evergreen : DEFAULT_HERO_CONTENT.evergreen;
        setEvergreen(slides);
        setEvergreenChips(slides.map((slide) => slide.chips.join(", ")));
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "Could not load the hero.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = (next: Partial<HeroOffer>) => setDraft((current) => ({ ...current, ...next }));
  const patchSlide = (index: number, next: Partial<HeroEvergreenSlide>) => {
    setEvergreen((current) => current.map((slide, itemIndex) => (itemIndex === index ? { ...slide, ...next } : slide)));
  };

  const onUpload = async (files: FileList | null, target: "offer" | number) => {
    const file = files?.[0];
    if (!file || uploading) return;
    setUploading(target === "offer" ? "offer" : `slide-${target}`);
    setError("");
    try {
      const scope = target === "offer" ? "homepage" : `hero-${evergreen[target]?.id || target}`;
      const url = await uploadAdminImage(file, { role: "banner", scope });
      if (target === "offer") patch({ image: url });
      else patchSlide(target, { image: url });
      setMessage("Image uploaded.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not upload that image.");
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <p className="text-mute">Loading hero…</p>;

  return (
    <div className="max-w-2xl">
      <AdminPageHeader
        title="Homepage hero"
        purpose="These are the first slides on the homepage. The campaign slide is for a sale or festival (you can turn it off). The product slides stay on all the time. Upload photos here — no redeploy needed."
      />

      <form
        className="mt-8 space-y-10"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setError("");
          setMessage("");
          const chips = chipsText
            .split(",")
            .map((chip) => chip.trim())
            .filter(Boolean);
          const offer: HeroOffer = { ...draft, chips };
          const slides = evergreen.map((slide, index) => ({
            ...slide,
            chips: evergreenChips[index]
              .split(",")
              .map((chip) => chip.trim())
              .filter(Boolean),
          }));
          try {
            const response = await fetch("/api/admin/hero", {
              method: "PUT",
              headers: { "Content-Type": "application/json", ...csrfHeaders() },
              body: JSON.stringify({ content: { offer, evergreen: slides } }),
            });
            const data = (await response.json()) as {
              ok?: boolean;
              offer?: HeroOffer;
              evergreen?: HeroEvergreenSlide[];
              message?: string;
              error?: string;
            };
            if (!response.ok || !data.offer) throw new Error(data.error || "Could not save.");
            setDraft(data.offer);
            setChipsText(data.offer.chips.join(", "));
            const nextSlides = data.evergreen?.length ? data.evergreen : slides;
            setEvergreen(nextSlides);
            setEvergreenChips(nextSlides.map((slide) => slide.chips.join(", ")));
            setMessage(data.message || "Saved.");
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : "Could not save.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <section className="space-y-4 border-b border-line pb-10">
          <div>
            <h2 className="font-serif text-3xl">Campaign slide</h2>
            <p className="mt-2 text-sm text-mute">Optional sale or festival slide. Turn it off to hide it without deleting the copy.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.enabled} onChange={(event) => patch({ enabled: event.target.checked })} />
            Show campaign slide on the homepage
          </label>

          <AdminField label="Pill label" value={draft.pill} onChange={(pill) => patch({ pill })} />
          <AdminField label="Title line 1" value={draft.titleLine1} onChange={(titleLine1) => patch({ titleLine1 })} />
          <AdminField label="Title line 2 (accent)" value={draft.titleLine2} onChange={(titleLine2) => patch({ titleLine2 })} />
          <label className="block text-sm">
            Supporting note
            <textarea
              value={draft.note}
              onChange={(event) => patch({ note: event.target.value })}
              rows={3}
              className="mt-2 w-full border-b border-line bg-transparent outline-none"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Primary CTA" value={draft.cta} onChange={(cta) => patch({ cta })} />
            <AdminField label="Primary link" value={draft.href} onChange={(href) => patch({ href })} />
            <AdminField label="Secondary CTA" value={draft.secondaryCta} onChange={(secondaryCta) => patch({ secondaryCta })} />
            <AdminField label="Secondary link" value={draft.secondaryHref} onChange={(secondaryHref) => patch({ secondaryHref })} />
          </div>

          <AdminField label="Coupon code" value={draft.couponCode} onChange={(couponCode) => patch({ couponCode })} />
          <AdminField label="Seal label (rotating ring)" value={draft.sealLabel} onChange={(sealLabel) => patch({ sealLabel })} />
          <AdminField label="Seal percent" value={draft.sealPercent} onChange={(sealPercent) => patch({ sealPercent })} />

          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Card tag" value={draft.cardTag} onChange={(cardTag) => patch({ cardTag })} />
            <AdminField label="Card name" value={draft.cardName} onChange={(cardName) => patch({ cardName })} />
          </div>
          <AdminField label="Chips (comma-separated)" value={chipsText} onChange={setChipsText} />

          <AdminField label="Image URL" value={draft.image} onChange={(image) => patch({ image })} />
          <AdminField label="Image alt text" value={draft.alt} onChange={(alt) => patch({ alt })} />
          <label className="block text-sm">
            Upload campaign image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={Boolean(uploading)}
              className="mt-2 block w-full text-sm"
              onChange={(event) => void onUpload(event.target.files, "offer")}
            />
            <span className="mt-1 block text-xs text-mute">{uploading === "offer" ? "Uploading…" : "JPEG, PNG, or WebP under 6 MB."}</span>
          </label>

          {draft.image ? (
            <div className="relative h-40 w-full max-w-sm overflow-hidden rounded-lg border border-line bg-paper">
              <Media src={draft.image} alt={draft.alt || "Hero preview"} className="object-cover" sizes="100vw" />
            </div>
          ) : null}
        </section>

        <section className="space-y-8">
          <div>
            <h2 className="font-serif text-3xl">Product slides</h2>
            <p className="mt-2 text-sm text-mute">Always-on slides (body butter, scrub, salts). They rotate with the campaign slide when that slide is enabled.</p>
          </div>
          {evergreen.map((slide, index) => (
            <div key={slide.id} className="space-y-4 rounded-2xl border border-line p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Slide {index + 1} · {slide.label}</p>
              <AdminField label="Pill" value={slide.pill} onChange={(pill) => patchSlide(index, { pill })} />
              <AdminField label="Title line 1" value={slide.titleLine1} onChange={(titleLine1) => patchSlide(index, { titleLine1 })} />
              <AdminField label="Title line 2" value={slide.titleLine2} onChange={(titleLine2) => patchSlide(index, { titleLine2 })} />
              <label className="block text-sm">
                Note
                <textarea
                  value={slide.note}
                  onChange={(event) => patchSlide(index, { note: event.target.value })}
                  rows={2}
                  className="mt-2 w-full border-b border-line bg-transparent outline-none"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <AdminField label="Primary CTA" value={slide.cta} onChange={(cta) => patchSlide(index, { cta })} />
                <AdminField label="Primary link" value={slide.href} onChange={(href) => patchSlide(index, { href })} />
              </div>
              <AdminField
                label="Chips (comma-separated)"
                value={evergreenChips[index] || ""}
                onChange={(value) => setEvergreenChips((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))}
              />
              <AdminField label="Image URL" value={slide.image} onChange={(image) => patchSlide(index, { image })} />
              <AdminField label="Image alt" value={slide.alt} onChange={(alt) => patchSlide(index, { alt })} />
              <label className="block text-sm">
                Upload slide image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={Boolean(uploading)}
                  className="mt-2 block w-full text-sm"
                  onChange={(event) => void onUpload(event.target.files, index)}
                />
                <span className="mt-1 block text-xs text-mute">{uploading === `slide-${index}` ? "Uploading…" : "JPEG, PNG, or WebP under 6 MB."}</span>
              </label>
              {slide.image ? (
                <div className="relative h-36 w-full max-w-sm overflow-hidden rounded-lg border border-line bg-paper">
                  <Media src={slide.image} alt={slide.alt || slide.label} className="object-cover" sizes="100vw" />
                </div>
              ) : null}
            </div>
          ))}
        </section>

        {error ? <p role="status" className="text-sm text-red-700">{error}</p> : null}
        {message ? <p role="status" className="text-sm text-mute">{message}</p> : null}
        <button type="submit" disabled={saving} className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper disabled:opacity-60">
          {saving ? "Saving…" : "Save hero"}
        </button>
      </form>
    </div>
  );
}

export function SiteMediaManager() {
  const store = useStore();
  const [draft, setDraft] = useState<SiteMediaSettings>(DEFAULT_SITE_MEDIA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/admin/site-media", { headers: csrfHeaders() });
        const data = (await response.json()) as { ok?: boolean; media?: SiteMediaSettings; error?: string };
        if (!response.ok || !data.media) throw new Error(data.error || "Could not load site images.");
        if (cancelled) return;
        setDraft(data.media);
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "Could not load site images.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = (next: Partial<SiteMediaSettings>) => setDraft((current) => ({ ...current, ...next }));

  const onUploadSlot = async (files: FileList | null, key: string, scope: string) => {
    const file = files?.[0];
    if (!file || uploading) return;
    setUploading(key);
    setError("");
    try {
      const url = await uploadAdminImage(file, { role: "banner", scope });
      if (key.startsWith("strip:")) {
        const index = Number(key.slice(6));
        patch({
          categoryStrip: draft.categoryStrip.map((item, itemIndex) => (itemIndex === index ? { ...item, image: url } : item)),
        });
      } else if (key.startsWith("review:")) {
        const index = Number(key.slice(7));
        patch({
          reviews: draft.reviews.map((item, itemIndex) => (itemIndex === index ? { ...item, image: url } : item)),
        });
      } else {
        patch({ [key]: url } as Partial<SiteMediaSettings>);
      }
      setMessage("Image uploaded.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not upload that image.");
    } finally {
      setUploading(null);
    }
  };

  const patchStrip = (index: number, next: Partial<SiteMediaStripItem>) => {
    patch({
      categoryStrip: draft.categoryStrip.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item)),
    });
  };

  const patchReview = (index: number, next: Partial<SiteMediaReview>) => {
    patch({
      reviews: draft.reviews.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item)),
    });
  };

  if (loading) return <p className="text-mute">Loading site images…</p>;

  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="Website photos"
        purpose="Marketing photos that are not product galleries. Use this when a homepage, shop, login, or checkout image needs a real Silken Knot photo. Scroll to the section that matches where it appears on the store."
      />

      <form
        className="mt-8 space-y-10"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setError("");
          setMessage("");
          try {
            const response = await fetch("/api/admin/site-media", {
              method: "PUT",
              headers: { "Content-Type": "application/json", ...csrfHeaders() },
              body: JSON.stringify({ media: draft }),
            });
            const data = (await response.json()) as { ok?: boolean; media?: SiteMediaSettings; message?: string; error?: string };
            if (!response.ok || !data.media) throw new Error(data.error || "Could not save.");
            setDraft(data.media);
            primeSiteMediaCache(data.media);
            setMessage(data.message || "Saved.");
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : "Could not save.");
          } finally {
            setSaving(false);
          }
        }}
      >
        {(
          [
            {
              title: "Homepage collection tiles",
              hint: "Large photos in the “Four ways to begin” section and related collection cards.",
              keys: ["collectionBodyCare", "collectionBathSoap", "collectionAromatherapy", "collectionLifestyle", "collectionLifestyleWide", "bestsellerButter", "bestsellerSoap", "bestsellerCandle", "whySilkKnot", "brandStory", "newsletterBackground"] as const,
            },
            {
              title: "Shop page banners",
              hint: "Top banner and lower story banner on the shop page.",
              keys: ["shopHero", "shopEditorial"] as const,
            },
            {
              title: "Sign-in, checkout & wishlist",
              hint: "Backgrounds on login, checkout header, and wishlist page.",
              keys: ["authBackground", "checkoutBanner", "wishlistBanner"] as const,
            },
          ] as const
        ).map((group) => (
          <section key={group.title} className="space-y-6">
            <div>
              <h2 className="font-serif text-3xl">{group.title}</h2>
              <p className="mt-2 text-sm text-mute">{group.hint}</p>
            </div>
            {SITE_MEDIA_SLOTS.filter((slot) => (group.keys as readonly string[]).includes(slot.key)).map((slot) => {
              const value = draft[slot.key];
              return (
                <div key={slot.key} className="space-y-3 rounded-2xl border border-line p-5">
                  <div>
                    <p className="font-medium">{slot.label}</p>
                    <p className="text-sm text-mute">{slot.hint}</p>
                  </div>
                  <AdminField label="Image URL" value={value} onChange={(image) => patch({ [slot.key]: image } as Partial<SiteMediaSettings>)} />
                  <label className="block text-sm">
                    Upload
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={Boolean(uploading)}
                      className="mt-2 block w-full text-sm"
                      onChange={(event) => void onUploadSlot(event.target.files, slot.key, `site-${slot.key}`)}
                    />
                    <span className="mt-1 block text-xs text-mute">{uploading === slot.key ? "Uploading…" : "JPEG, PNG, or WebP under 6 MB."}</span>
                  </label>
                  {value ? (
                    <div className="relative h-32 w-full max-w-sm overflow-hidden rounded-lg border border-line bg-paper">
                      <Media src={value} alt={slot.label} className="object-cover" sizes="400px" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        ))}

        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-3xl">Homepage category strip</h2>
            <p className="mt-2 text-sm text-mute">Circular tiles under the homepage hero (Body Butter, Soap, Candles, and so on).</p>
          </div>
          {draft.categoryStrip.map((item, index) => (
            <div key={item.id} className="space-y-3 rounded-2xl border border-line p-5">
              <AdminField label="Name" value={item.name} onChange={(name) => patchStrip(index, { name })} />
              <AdminField label="Link" value={item.href} onChange={(href) => patchStrip(index, { href })} />
              <AdminField label="Image URL" value={item.image} onChange={(image) => patchStrip(index, { image })} />
              <label className="block text-sm">
                Upload
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={Boolean(uploading)}
                  className="mt-2 block w-full text-sm"
                  onChange={(event) => void onUploadSlot(event.target.files, `strip:${index}`, `site-strip-${item.id}`)}
                />
                <span className="mt-1 block text-xs text-mute">{uploading === `strip:${index}` ? "Uploading…" : "JPEG, PNG, or WebP under 6 MB."}</span>
              </label>
              {item.image ? (
                <div className="relative size-24 overflow-hidden rounded-full border border-line bg-paper">
                  <Media src={item.image} alt={item.name} className="object-cover" sizes="96px" />
                </div>
              ) : null}
            </div>
          ))}
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-3xl">Homepage reviews</h2>
            <p className="mt-2 text-sm text-mute">
              Quotes on the homepage. Prefer linking each card to a product so the live product photo shows; otherwise upload a fallback image.
            </p>
          </div>
          {draft.reviews.map((review, index) => (
            <div key={review.id} className="space-y-3 rounded-2xl border border-line p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <AdminField label="Customer name" value={review.name} onChange={(name) => patchReview(index, { name })} />
                <AdminField label="City" value={review.city} onChange={(city) => patchReview(index, { city })} />
              </div>
              <label className="block text-sm">
                Quote
                <textarea
                  value={review.text}
                  onChange={(event) => patchReview(index, { text: event.target.value })}
                  rows={3}
                  className="mt-2 w-full border-b border-line bg-transparent outline-none"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  Product
                  <select
                    value={review.productId}
                    onChange={(event) => {
                      const product = store.products.find((item) => item.id === event.target.value);
                      patchReview(index, {
                        productId: event.target.value,
                        productName: product?.name || review.productName,
                        image: product?.images[0] || review.image,
                      });
                    }}
                    className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none"
                  >
                    <option value="">Custom / fallback only</option>
                    {store.products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <AdminField label="Product label" value={review.productName} onChange={(productName) => patchReview(index, { productName })} />
              </div>
              <AdminField label="Fallback image URL" value={review.image} onChange={(image) => patchReview(index, { image })} />
              <label className="block text-sm">
                Upload fallback image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={Boolean(uploading)}
                  className="mt-2 block w-full text-sm"
                  onChange={(event) => void onUploadSlot(event.target.files, `review:${index}`, `site-review-${review.id}`)}
                />
                <span className="mt-1 block text-xs text-mute">{uploading === `review:${index}` ? "Uploading…" : "JPEG, PNG, or WebP under 6 MB."}</span>
              </label>
            </div>
          ))}
        </section>

        {error ? <p role="status" className="text-sm text-red-700">{error}</p> : null}
        {message ? <p role="status" className="text-sm text-mute">{message}</p> : null}
        <button type="submit" disabled={saving} className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper disabled:opacity-60">
          {saving ? "Saving…" : "Save site images"}
        </button>
      </form>
    </div>
  );
}

export function BrandManager() {
  const [draft, setDraft] = useState<BrandSettings>(DEFAULT_BRAND);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/admin/brand", { headers: csrfHeaders() });
        const data = (await response.json()) as { ok?: boolean; brand?: BrandSettings; error?: string };
        if (!response.ok || !data.brand) throw new Error(data.error || "Could not load the brand icon.");
        if (cancelled) return;
        setDraft(data.brand);
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "Could not load the brand icon.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = (next: Partial<BrandSettings>) => setDraft((current) => ({ ...current, ...next }));

  const onUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("role", "brand");
      const response = await fetch("/api/admin/media", { method: "POST", headers: csrfHeaders(false), body });
      const payload = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !payload.url) throw new Error(payload.message || "Could not upload that image.");
      patch({ iconUrl: payload.url });
      setMessage("Icon uploaded. Save to publish it everywhere.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p className="text-mute">Loading brand…</p>;

  return (
    <div className="max-w-2xl">
      <AdminPageHeader
        title="Logo"
        purpose="The Silken Knot mark shown in the header, footer, checkout, and sign-in. Upload a clear square icon, then save."
      />

      <form
        className="mt-8 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setError("");
          setMessage("");
          try {
            const response = await fetch("/api/admin/brand", {
              method: "PUT",
              headers: { "Content-Type": "application/json", ...csrfHeaders() },
              body: JSON.stringify({ brand: draft }),
            });
            const data = (await response.json()) as { ok?: boolean; brand?: BrandSettings; message?: string; error?: string };
            if (!response.ok || !data.brand) throw new Error(data.error || "Could not save.");
            setDraft(data.brand);
            primeBrandCache(data.brand);
            setMessage(data.message || "Saved.");
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : "Could not save.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <AdminField label="Icon URL" value={draft.iconUrl} onChange={(iconUrl) => patch({ iconUrl })} />
        <AdminField label="Icon alt text" value={draft.iconAlt} onChange={(iconAlt) => patch({ iconAlt })} />
        <label className="block text-sm">
          Upload brand icon
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            className="mt-2 block w-full text-sm"
            onChange={(event) => void onUpload(event.target.files)}
          />
          <span className="mt-1 block text-xs text-mute">{uploading ? "Uploading…" : "JPEG, PNG, or WebP under 6 MB. Prefer a square mark with a transparent background."}</span>
        </label>

        {draft.iconUrl ? (
          <div className="flex items-end gap-6">
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.iconUrl} alt={draft.iconAlt || "Brand icon preview"} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="relative flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.iconUrl} alt={draft.iconAlt || "Brand logo preview"} className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        ) : null}

        {error ? <p role="status" className="text-sm text-red-700">{error}</p> : null}
        {message ? <p role="status" className="text-sm text-mute">{message}</p> : null}
        <button type="submit" disabled={saving} className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper disabled:opacity-60">
          {saving ? "Saving…" : "Save brand icon"}
        </button>
      </form>
    </div>
  );
}

export function OfferManager() {
  const store = useStore();
  const blank: Coupon = { id: "", code: "", type: "percent", value: 10, scope: "order", active: true, label: "" };
  const [draft, setDraft] = useState<Coupon>(blank);
  const [error, setError] = useState("");
  return (
    <div>
      <AdminPageHeader
        title="Discount codes"
        purpose="Coupon codes customers type at checkout (for example DIWALI20). Create a code, choose percent or fixed amount, then turn it active."
      />
      <ul className="mt-8 divide-y divide-line">
        {store.coupons.map((coupon) => (
          <li key={coupon.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-serif text-2xl">{coupon.code}</p>
              <p className="text-sm text-mute">{coupon.label} · {coupon.scope} · {coupon.active ? "Active" : "Paused"}</p>
            </div>
            <div className="flex gap-3 text-[11px] uppercase tracking-[0.16em]">
              <button type="button" onClick={() => setDraft(coupon)}>Edit</button>
              <button type="button" onClick={() => store.deleteCoupon(coupon.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-8 max-w-xl space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const isNew = !draft.id || !store.coupons.some((coupon) => coupon.id === draft.id);
          const result = await store.saveCoupon({ ...draft, id: draft.id || `coupon-${Date.now()}`, label: draft.label || draft.code }, isNew);
          setError(result.message || "");
          if (result.ok) setDraft(blank);
        }}
      >
        <AdminField label="Code" value={draft.code} onChange={(code) => setDraft({ ...draft, code })} />
        <AdminField label="Label" value={draft.label} onChange={(label) => setDraft({ ...draft, label })} />
        <label className="block text-sm">
          Type
          <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as Coupon["type"] })} className="mt-2 h-11 w-full border-b border-line bg-transparent">
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>
        <AdminField label="Value" value={String(draft.value)} onChange={(value) => setDraft({ ...draft, value: Number(value) || 0 })} />
        <label className="block text-sm">
          Scope
          <select value={draft.scope} onChange={(event) => setDraft({ ...draft, scope: event.target.value as Coupon["scope"] })} className="mt-2 h-11 w-full border-b border-line bg-transparent">
            <option value="order">Order</option>
            <option value="product">Product</option>
            <option value="category">Category</option>
          </select>
        </label>
        {draft.scope === "product" ? (
          <label className="block text-sm">
            Product
            <select value={draft.productId ?? ""} onChange={(event) => setDraft({ ...draft, productId: event.target.value })} className="mt-2 h-11 w-full border-b border-line bg-transparent">
              <option value="">Choose</option>
              {store.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
        ) : null}
        {draft.scope === "category" ? (
          <label className="block text-sm">
            Category
            <select value={draft.categoryId ?? ""} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })} className="mt-2 h-11 w-full border-b border-line bg-transparent">
              <option value="">Choose</option>
              {store.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
          Active
        </label>
        {error ? <p role="status" className="text-sm">{error}</p> : null}
        <button type="submit" className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper">Save offer</button>
      </form>
    </div>
  );
}

type ShippingLabelView = {
  kind: "pdf" | "link" | "data";
  waybill: string;
  pdfSize: "A4" | "4R";
  requestedPdf: boolean;
  downloadUrl: string;
  expiresInSeconds: number | null;
  pdfBase64: string;
  packagesFound: number;
  fields: { key: string; value: string }[];
};

function openPdf(base64: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  window.open(url, "_blank", "noopener");
}

function FulfilmentPanel({ orderId, initial }: { orderId: string; initial: Order }) {
  const [order, setOrder] = useState(initial);
  const [message, setMessage] = useState("");
  const [labelSize, setLabelSize] = useState<"A4" | "4R">("4R");
  const [label, setLabel] = useState<ShippingLabelView | null>(null);
  async function run(action: string, extra: Record<string, unknown> = {}) {
    setMessage("");
    if (action !== "shipping-label") setLabel(null);
    const response = await fetch("/api/admin/fulfilment", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ action, orderId, ...extra }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Could not update fulfilment.");
      return;
    }
    if (body.order) setOrder(body.order);
    if (action === "shipping-label" && body.label) {
      setLabel(body.label);
      setMessage(body.label.kind === "link" ? "Delhivery returned a label link." : body.label.kind === "pdf" ? "Delhivery returned a PDF." : "Delhivery returned label data.");
      return;
    }
    setMessage("Saved.");
  }
  const shipment = order.shipment;
  return (
    <section className="mt-10 border-t border-line pt-6">
      <h2 className="font-serif text-3xl">Fulfilment</h2>
      <p className="mt-2 text-sm">Payment {order.paymentState || "—"} · Shipment {shipment?.state || "not_created"} · {shipment?.provider || "manual"}</p>
      {shipment?.test ? <p className="mt-2 text-sm">Test shipment. Not sent to Delhivery. Refresh tracking to add the next test event.</p> : null}
      {shipment?.awb ? <p className="mt-2 text-sm">Waybill {shipment.awb}</p> : null}
      {shipment?.weightGrams ? <p className="mt-2 text-sm">Parcel weight for testing: {shipment.weightGrams} g{shipment.packageData === "product_weights" ? "" : " · includes a product still using the store fallback"}</p> : null}
      {order.payment === "cod" ? <p className="mt-2 text-sm">Cash on delivery {order.codCollection === "due" ? "is still due" : "does not apply"}.</p> : null}
      {shipment?.lastError ? <p className="mt-2 text-sm">{shipment.lastError}</p> : null}
      <ul className="mt-4 space-y-2 text-sm">
        {(shipment?.events || []).map((event) => <li key={`${event.at}-${event.providerStatus}`}>{event.at} · {event.providerStatus}</li>)}
      </ul>
      {shipment?.awb && !shipment.test ? (
        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-sm">Prepare for dispatch</h3>
          <p className="mt-1 text-sm text-mute">Uses this waybill with Delhivery’s shipping-label options. A4 is a full page. 4R is a 4×6 label.</p>
          <label className="mt-3 block text-sm">Label size
            <select value={labelSize} onChange={(event) => setLabelSize(event.target.value === "A4" ? "A4" : "4R")} className="mt-1 h-11 w-full max-w-xs border-b border-line bg-transparent">
              <option value="4R">4R · 4×6</option>
              <option value="A4">A4 · 8×11</option>
            </select>
          </label>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("shipping-label", { pdf: true, pdfSize: labelSize })}>Get printable PDF</button>
            <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("shipping-label", { pdf: false, pdfSize: labelSize })}>Get label data</button>
          </div>
          {label?.kind === "link" ? (
            <p className="mt-3 text-sm">
              <a className="underline" href={label.downloadUrl} target="_blank" rel="noreferrer">Open shipping label</a>
              {label.expiresInSeconds ? ` · link expires in ${Math.round(label.expiresInSeconds / 3600)} hours` : null}
            </p>
          ) : null}
          {label?.kind === "pdf" && label.pdfBase64 ? <button type="button" className="mt-3 h-10 border-b border-line text-sm" onClick={() => openPdf(label.pdfBase64)}>Open PDF</button> : null}
          {label?.kind === "data" && label.fields.length ? (
            <dl className="mt-3 space-y-1 text-sm">
              {label.fields.map((field) => <div key={field.key} className="flex gap-3"><dt className="w-40 shrink-0 text-mute">{field.key}</dt><dd className="break-all">{field.value}</dd></div>)}
            </dl>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("refresh")}>Refresh tracking</button>
        <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("retry-booking", { acknowledgeAbsent: window.confirm("Confirm Delhivery has no shipment for this order before booking again.") })}>Retry booking</button>
        <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("pickup")}>Request pickup</button>
        <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("cancel-shipment", { confirm: window.confirm("Cancel this shipment?") })}>Cancel shipment</button>
        <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("manual")}>Manual fulfilment</button>
        <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("refund")}>Request refund</button>
      </div>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
    </section>
  );
}
