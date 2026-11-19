"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Ban,
  ChevronDown,
  Banknote,
  Eye,
  ShieldCheck,
  FileText,
  Hand,
  ImagePlus,
  Loader2,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { couponProductIds, formatDate, formatPrice, slugify } from "@/lib/format";
import {
  DEFAULT_PRODUCT_CLAIMS,
  PRODUCT_CLAIMS,
  normalizeProductClaims,
  toggleProductClaim,
} from "@/lib/product-claims";
import { useStore } from "@/lib/store";
import type { Category, Coupon, Order, OrderStatus, Product, Variant } from "@/lib/types";
import type { HeroContent, HeroEvergreenSlide, HeroOffer } from "@/lib/hero/content";
import { DEFAULT_HERO_CONTENT, DEFAULT_HERO_OFFER } from "@/lib/hero/content";
import type { SiteMediaReview, SiteMediaSettings, SiteMediaStripItem } from "@/lib/site-media/content";
import { DEFAULT_SITE_MEDIA, SITE_MEDIA_SLOTS } from "@/lib/site-media/content";
import { primeSiteMediaCache } from "@/lib/site-media/client";
function linesToList(value: string) {
  return value.split("\n").map((item) => item.trimEnd());
}
import { Media } from "@/components/ui";
import { csrfHeaders } from "@/lib/auth/browser";
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminPanel,
  AdminStatCard,
  AdminStickyActions,
  AdminTip,
  adminBtn,
  adminControl,
} from "@/components/admin/AdminShell";
import {
  AdminEditorSkeleton,
  AdminFormSkeleton,
  AdminPageHeaderSkeleton,
} from "@/components/admin/AdminSkeletons";
import { HeroDraftPreview } from "@/components/admin/HeroDraftPreview";
import {
  CategoryDraftPreview,
  ProductDraftPreview,
  SiteMediaDraftPreview,
} from "@/components/admin/StorefrontPreviews";
import { PRODUCT_CLAIM_ICONS } from "@/components/product/ProductClaims";

export {
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminPanel,
  AdminShell,
  AdminStatCard,
  AdminStickyActions,
  AdminTip,
  adminBtn,
  adminControl,
} from "@/components/admin/AdminShell";

function parseChipList(value: string) {
  return value
    .split(",")
    .map((chip) => chip.trim())
    .filter(Boolean);
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

type LoginStep = "credentials" | "channel" | "code" | "forgot" | "forgot-code";

function AdminOtpInput({
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] || "");

  useEffect(() => {
    if (!autoFocus) return;
    const focus = window.setTimeout(() => inputs.current[0]?.focus(), 0);
    return () => window.clearTimeout(focus);
  }, [autoFocus]);

  function write(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      const next = digits.map((digit, i) => (i === index ? "" : digit));
      onChange(next.join(""));
      return;
    }
    if (cleaned.length > 1) {
      const next = [...digits];
      cleaned.slice(0, 6 - index).split("").forEach((digit, offset) => {
        next[index + offset] = digit;
      });
      onChange(next.join("").slice(0, 6));
      inputs.current[Math.min(index + cleaned.length, 5)]?.focus();
      return;
    }
    const next = digits.map((digit, i) => (i === index ? cleaned : digit));
    onChange(next.join(""));
    if (index < 5) inputs.current[index + 1]?.focus();
  }

  return (
    <div className="mt-3 grid grid-cols-6 gap-2" role="group" aria-label="Six-digit one-time password">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputs.current[index] = node;
          }}
          aria-label={`OTP digit ${index + 1}`}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          inputMode="numeric"
          maxLength={6}
          disabled={disabled}
          value={digit}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => write(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              event.preventDefault();
              if (digits[index]) {
                write(index, "");
                return;
              }
              if (index > 0) {
                const next = [...digits];
                next[index - 1] = "";
                onChange(next.join(""));
                inputs.current[index - 1]?.focus();
              }
              return;
            }
            if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
            if (event.key === "ArrowRight" && index < 5) inputs.current[index + 1]?.focus();
          }}
          onPaste={(event) => {
            event.preventDefault();
            write(index, event.clipboardData.getData("text"));
          }}
          className="h-14 w-full min-w-0 rounded-lg border border-stone bg-white text-center text-xl text-ink outline-none transition-[border-color,box-shadow] focus:border-mist focus:shadow-[0_0_0_3px_rgb(97_162_175_/_28%)] disabled:opacity-60"
        />
      ))}
    </div>
  );
}

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
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
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
              className={`mt-1.5 ${adminControl.input}`}
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
              className={`mt-1.5 ${adminControl.input}`}
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
          <div>
            <p className="text-sm">6-digit code</p>
            <AdminOtpInput value={code} onChange={setCode} disabled={busy} autoFocus />
          </div>
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
              className={`mt-1.5 ${adminControl.input}`}
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
          <div>
            <p className="text-sm">6-digit code</p>
            <AdminOtpInput value={code} onChange={setCode} disabled={busy} autoFocus />
          </div>
          <label className="mt-6 block text-sm">
            New password
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={`mt-1.5 ${adminControl.input}`}
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
              className={`mt-1.5 ${adminControl.input}`}
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
  { href: "/admin/orders", title: "Fulfill orders", hint: "Open new orders, mark packed or shipped, print labels." },
  { href: "/admin/products", title: "Add or edit products", hint: "Change name, price, stock, and photos. Save updates the shop." },
  { href: "/admin/hero", title: "Change homepage hero", hint: "Edit the sale slide and product slides customers see first." },
  { href: "/admin/site-media", title: "Replace website photos", hint: "Swap photos on home, login, and checkout pages." },
  { href: "/admin/offers", title: "Create a discount code", hint: "Make a code shoppers type at checkout, then turn it on." },
  { href: "/admin/shipping", title: "Update shipping / delivery", hint: "Set delivery rates, free shipping, and Delhivery." },
];

export function Dashboard() {
  const store = useStore();
  const revenue = store.orders
    .filter(
      (order) =>
        order.status !== "cancelled" &&
        order.status !== "pending_payment" &&
        (order.paymentState === "captured" || order.payment === "cod"),
    )
    .reduce((sum, order) => sum + order.total, 0);
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
        purpose="Store snapshot and shortcuts to everyday work."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([value, label]) => (
          <AdminStatCard key={String(label)} label={String(label)} value={value} />
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-ink">Common tasks</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {commonTasks.map((task) => (
          <li key={task.href}>
            <AdminTip label={task.title} className="h-full w-full">
              <Link
                href={task.href}
                className="block h-full cursor-pointer rounded-xl border border-line bg-paper p-4 transition-colors duration-200 hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <p className="text-sm font-medium text-ink">{task.title}</p>
                <p className="mt-1.5 text-sm leading-6 text-mute">{task.hint}</p>
              </Link>
            </AdminTip>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-lg font-semibold text-ink">Needs attention</h2>
      <p className="mt-1.5 text-sm text-mute">Low stock (under 8). Open a product to restock.</p>
      <ul className="mt-4 space-y-2 text-sm">
        {low.map((product) => (
          <li key={product.id}>
            <Link
              href={`/admin/products/${product.id}`}
              className="font-medium underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {product.name}
            </Link>{" "}
            <span className="text-mute">is low in stock — open it and raise quantity, then save.</span>
          </li>
        ))}
        {low.length === 0 ? <li className="text-mute">Nothing urgent. Stock looks fine.</li> : null}
      </ul>
    </div>
  );
}

function productStockTotal(product: Product) {
  return product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stock || 0), 0);
}

function statusPill(tone: "ok" | "warn" | "mute" | "danger" | "info", label: string) {
  const tones = {
    ok: "bg-[#e8f0e6] text-[#3d5a3a]",
    warn: "bg-[#f7f7f6] text-[#7a5a28]",
    mute: "bg-[#f7f7f6] text-[#6f675d]",
    danger: "bg-[#f6e4e1] text-[#8a3b32]",
    info: "bg-[#e7eef5] text-[#3d5670]",
  } as const;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${tones[tone]}`}>
      {label}
    </span>
  );
}

function humanLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function ProductIndex() {
  const store = useStore();
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<"all" | "active" | "hidden">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

  const stats = useMemo(() => {
    const active = store.products.filter((product) => product.active).length;
    const low = store.products.filter((product) => {
      const stock = productStockTotal(product);
      return stock > 0 && stock <= 5;
    }).length;
    const out = store.products.filter((product) => productStockTotal(product) === 0).length;
    return { total: store.products.length, active, hidden: store.products.length - active, low, out };
  }, [store.products]);

  const products = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return store.products.filter((product) => {
      if (visibility === "active" && !product.active) return false;
      if (visibility === "hidden" && product.active) return false;
      const stock = productStockTotal(product);
      if (stockFilter === "low" && !(stock > 0 && stock <= 5)) return false;
      if (stockFilter === "out" && stock !== 0) return false;
      if (!needle) return true;
      const category = store.categories.find((item) => item.id === product.categoryId)?.name || "";
      return `${product.name} ${product.type} ${product.scent} ${category}`.toLowerCase().includes(needle);
    });
  }, [store.products, store.categories, query, visibility, stockFilter]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Products"
        purpose="These are the items customers buy. Edit name, price, stock, and photos here."
        action={
          <AdminTip label="Add product">
            <Link href="/admin/products/new" className={adminBtn.primary}>
              <Plus size={14} /> Add product
            </Link>
          </AdminTip>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total", value: stats.total },
          { label: "Active on shop", value: stats.active },
          { label: "Hidden", value: stats.hidden },
          { label: "Low / out of stock", value: stats.low + stats.out },
        ].map((item) => (
          <AdminStatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <AdminFilterBar>
        <label className="min-w-[14rem] flex-1 text-sm">
          Search
          <span className={`mt-1.5 flex items-center gap-2 ${adminControl.input}`}>
            <Search size={14} className="shrink-0 text-mute" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, type, scent, category"
              className="h-full w-full bg-transparent text-sm outline-none"
            />
          </span>
        </label>
        <label className="text-sm">
          Visibility
          <select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)} className={`mt-1.5 ${adminControl.select}`}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label className="text-sm">
          Stock
          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as typeof stockFilter)} className={`mt-1.5 ${adminControl.select}`}>
            <option value="all">All</option>
            <option value="low">Low (≤ 5)</option>
            <option value="out">Out of stock</option>
          </select>
        </label>
      </AdminFilterBar>

      {products.length === 0 ? (
        <AdminEmptyState
          icon={<Package size={28} strokeWidth={1.4} />}
          title={store.products.length ? "No products match" : "No products yet"}
          body={
            store.products.length
              ? "Clear search or filters to see the full list."
              : "Add your first product so customers can buy from the shop."
          }
          action={
            !store.products.length ? (
              <AdminTip label="Add your first product">
                <Link href="/admin/products/new" className={adminBtn.primary}>
                  <Plus size={14} /> Add your first product
                </Link>
              </AdminTip>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-mute">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Flags</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const stock = productStockTotal(product);
                  const category = store.categories.find((item) => item.id === product.categoryId)?.name || product.categoryId;
                  const thumb = product.images[0];
                  return (
                    <tr key={product.id} className="border-b border-line/70 align-middle transition-colors duration-200 last:border-b-0 hover:bg-cream/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="relative block size-14 shrink-0 overflow-hidden rounded-xl bg-[#f7f7f6]">
                            {thumb ? <Media src={thumb} alt="" sizes="56px" className="object-cover" /> : (
                              <span className="grid h-full place-items-center text-mute"><ImagePlus size={16} /></span>
                            )}
                          </span>
                          <div className="min-w-0">
                            <Link href={`/admin/products/${product.id}`} className="block truncate font-medium hover:underline">
                              {product.name}
                            </Link>
                            <p className="mt-0.5 truncate text-xs text-mute">{product.type}{product.scent ? ` · ${product.scent}` : ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-mute">{category}</td>
                      <td className="px-4 py-3">{formatPrice(product.price)}</td>
                      <td className="px-4 py-3">
                        {stock === 0 ? statusPill("danger", "Out") : stock <= 5 ? statusPill("warn", String(stock)) : <span>{stock}</span>}
                      </td>
                      <td className="px-4 py-3">{product.active ? statusPill("ok", "Active") : statusPill("mute", "Hidden")}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {product.bestseller ? statusPill("info", "Bestseller") : null}
                          {product.featured ? statusPill("info", "Featured") : null}
                          {product.newArrival ? statusPill("info", "New") : null}
                          {!product.bestseller && !product.featured && !product.newArrival ? <span className="text-mute">—</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <AdminTip label={`Edit ${product.name}`}>
                            <Link href={`/admin/products/${product.id}`} className={adminBtn.row} aria-label={`Edit ${product.name}`}>
                              <Pencil size={14} /> Edit
                            </Link>
                          </AdminTip>
                          <AdminTip label={`Delete ${product.name}`}>
                            <button
                              type="button"
                              className={adminBtn.rowDanger}
                              aria-label={`Delete ${product.name}`}
                              onClick={async () => {
                                if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
                                await store.deleteProduct(product.id);
                              }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </AdminTip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-4 py-3 text-xs text-mute">
            Showing {products.length} of {store.products.length} products
          </p>
        </div>
      )}
    </div>
  );
}

export function ProductEditor({ id }: { id?: string }) {
  const store = useStore();
  const existing = id ? store.productById(id) : undefined;
  if (!store.ready) return <AdminEditorSkeleton />;
  if (id && !existing) return <p>Product not found.</p>;
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
    claims: [...DEFAULT_PRODUCT_CLAIMS],
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

const StudioPanel = AdminPanel;

function ProductForm({ initial }: { initial?: Product }) {
  const store = useStore();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [product, setProduct] = useState<Product>(() => {
    const base = initial ?? blankProduct();
    return { ...base, claims: normalizeProductClaims(base.claims) };
  });
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  /** CDN URLs removed in the editor — deleted only after a successful product save. */
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [openDetail, setOpenDetail] = useState<Record<string, boolean>>({});
  const enabledClaims = new Set(normalizeProductClaims(product.claims));

  const set = <K extends keyof Product>(key: K, value: Product[K]) => setProduct((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const root = formRef.current;
      const target = event.target;
      if (!root || !(target instanceof Node)) return;
      if (root.contains(target)) return;
      const el = target instanceof Element ? target : target.parentElement;
      // Leave admin chrome / links alone; only blank outside clicks exit the editor.
      if (el?.closest("aside, header, a[href], [role='dialog']")) return;
      router.push("/admin/products");
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [router]);

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
    const images = product.images.filter((_, item) => item !== index);
    setProduct((current) => ({
      ...current,
      images,
      descriptionImage:
        current.descriptionImage && current.descriptionImage !== src
          ? current.descriptionImage
          : images[0],
    }));
    if (!src || src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) return;
    setPendingDeletes((current) => (current.includes(src) ? current : [...current, src]));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= product.images.length || from === to) return;
    const images = [...product.images];
    const [moved] = images.splice(from, 1);
    images.splice(to, 0, moved);
    set("images", images);
  };

  const setMainImage = (index: number) => {
    if (index <= 0 || index >= product.images.length) return;
    moveImage(index, 0);
  };

  const addImageUrl = () => {
    const value = imageUrl.trim();
    if (!value) return;
    if (value.startsWith("data:") || value.startsWith("blob:")) {
      setError("Browse a photo to upload it, or paste a public image address.");
      return;
    }
    set("images", [...product.images, value]);
    setImageUrl("");
  };

  const detailSections = (
    [
      ["showDescription", "Description", "description", "Long copy on the product page"] as const,
      ["showBenefits", "Benefits", "benefits", "One benefit per line"] as const,
      ["showIngredients", "Ingredients", "ingredients", "One ingredient per line"] as const,
      ["showHowToUse", "How to use", "howToUse", "One step per line"] as const,
    ]
  );

  return (
    <form
      ref={formRef}
      className="space-y-8"
      onSubmit={async (event) => {
        event.preventDefault();
        const nextImages = product.images;
        const descriptionImage =
          product.descriptionImage && nextImages.includes(product.descriptionImage)
            ? product.descriptionImage
            : nextImages[0];
        const result = await store.saveProduct(
          {
            ...product,
            descriptionImage,
            benefits: product.benefits.map((item) => item.trim()).filter(Boolean),
            ingredients: product.ingredients.map((item) => item.trim()).filter(Boolean),
            howToUse: product.howToUse.map((item) => item.trim()).filter(Boolean),
            claims: normalizeProductClaims(product.claims),
            slug: slugify(product.slug || product.name),
          },
          !initial,
        );
        if (!result.ok) return setError(result.message);
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
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-mute hover:text-ink">
          <ArrowLeft size={14} /> Products
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{initial ? "Edit product" : "New product"}</h1>
            <p className="mt-1.5 text-sm leading-6 text-mute">
              Product page details, photos, and stock. Preview on the right, then save.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.active ? statusPill("ok", "Active") : statusPill("mute", "Hidden")}
            {product.bestseller ? statusPill("info", "Bestseller") : null}
            {product.featured ? statusPill("info", "Featured") : null}
            {product.newArrival ? statusPill("info", "New") : null}
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] xl:items-start">
        <div className="mx-auto w-full max-w-3xl space-y-4 xl:mx-0">
          <StudioPanel title="Product information" hint="Name, category, and short summary">
            <AdminField label="Product name" value={product.name} onChange={(value) => set("name", value)} />
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm">
                Category
                <select
                  value={product.categoryId}
                  onChange={(event) => set("categoryId", event.target.value)}
                  className={`mt-1.5 ${adminControl.select}`}
                >
                  {store.categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <AdminField label="Type" value={product.type} onChange={(value) => set("type", value)} />
            </div>
            <AdminField label="Scent" value={product.scent} onChange={(value) => set("scent", value)} />
            <label className="block text-sm">
              Short description
              <textarea
                value={product.shortDescription}
                onChange={(event) => set("shortDescription", event.target.value)}
                className={`mt-1.5 ${adminControl.textarea}`}
              />
            </label>
          </StudioPanel>

          <StudioPanel
            title="Detail sections"
            hint="Optional long copy on the product page — collapsed by default"
            defaultOpen={false}
          >
            <p className="text-xs text-mute">
              Turn a section on to show it in the store, then write the copy. Expand each row with ^.
            </p>
            <div className="space-y-2">
              {detailSections.map(([flag, label, field, fieldHint]) => {
                const hasList = field === "benefits" || field === "ingredients" || field === "howToUse";
                const enabled =
                  product[flag] ??
                  (field === "description"
                    ? Boolean(product.description.trim())
                    : product[field].some((item) => item.trim()));
                const rowOpen = Boolean(openDetail[flag]);
                return (
                  <div key={flag} className="overflow-hidden rounded-xl border border-line bg-[#ffffff]">
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(event) => {
                            set(flag, event.target.checked);
                            if (event.target.checked) setOpenDetail((current) => ({ ...current, [flag]: true }));
                          }}
                        />
                        <span className="truncate font-medium">{label}</span>
                        {!enabled ? <span className="text-[11px] uppercase tracking-[0.12em] text-mute">Hidden on store</span> : null}
                      </label>
                      <AdminTip label={rowOpen ? `Hide ${label}` : `Show ${label}`}>
                        <button
                          type="button"
                          aria-label={rowOpen ? `Hide ${label}` : `Show ${label}`}
                          aria-expanded={rowOpen}
                          onClick={() => setOpenDetail((current) => ({ ...current, [flag]: !rowOpen }))}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-paper text-mute"
                        >
                          <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${rowOpen ? "rotate-180" : ""}`}
                            aria-hidden
                          />
                        </button>
                      </AdminTip>
                    </div>
                    {rowOpen ? (
                      <div className="border-t border-line px-3 py-3">
                        <label className="block text-sm">
                          <span className="text-xs text-mute">{fieldHint}</span>
                          <textarea
                            value={hasList ? product[field].join("\n") : product.description}
                            onChange={(event) => {
                              if (hasList) set(field, linesToList(event.target.value));
                              else set("description", event.target.value);
                            }}
                            disabled={!enabled}
                            className={`mt-1.5 ${adminControl.textarea} disabled:opacity-50`}
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </StudioPanel>

          <StudioPanel title="Media" hint="Gallery photos — pick featured and description roles">
            <label
              className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone bg-[#ffffff] text-sm text-mute"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void onFiles(event.dataTransfer.files);
              }}
            >
              <ImagePlus size={22} strokeWidth={1.5} />
              {uploading ? "Uploading to the image host…" : "Drop images or browse"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={uploading}
                className="sr-only"
                onChange={(event) => void onFiles(event.target.files)}
              />
            </label>
            <div className="flex gap-2">
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="Or paste an image URL"
                className={`flex-1 ${adminControl.input}`}
              />
              <AdminTip label="Add image URL">
                <button type="button" className="h-11 border border-line px-3 text-[11px] uppercase tracking-[0.16em]" onClick={addImageUrl}>
                  Add URL
                </button>
              </AdminTip>
            </div>
            {product.images.length ? (
              <div className="space-y-2">
                <p className="text-xs text-mute">
                  Featured leads the gallery. Description is the photo beside product copy. Drag a row or use arrows to reorder.
                </p>
                <ul className="space-y-2">
                  {product.images.map((src, index) => {
                    const isMain = index === 0;
                    const isDescription =
                      (product.descriptionImage || product.images[0]) === src;
                    return (
                      <li
                        key={`${src}-${index}`}
                        draggable
                        onDragStart={() => setDragIndex(index)}
                        onDragEnd={() => setDragIndex(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (dragIndex === null || dragIndex === index) return;
                          moveImage(dragIndex, index);
                          setDragIndex(null);
                        }}
                        className={`flex items-center gap-3 rounded-xl border bg-[#ffffff] p-2 ${
                          dragIndex === index ? "border-ink/40 opacity-70" : "border-line"
                        }`}
                      >
                        <span className="relative block h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-[#f7f7f6]">
                          <Media src={src} alt="" sizes="64px" className="object-cover" />
                        </span>
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-xs font-medium text-ink">Photo {index + 1}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-ink">
                              <input
                                type="radio"
                                name="product-featured-image"
                                checked={isMain}
                                onChange={() => setMainImage(index)}
                              />
                              Featured
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-ink">
                              <input
                                type="radio"
                                name="product-description-image"
                                checked={isDescription}
                                onChange={() => set("descriptionImage", src)}
                              />
                              Description
                            </label>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <AdminTip label="Move up">
                            <button
                              type="button"
                              aria-label="Move image up"
                              disabled={index === 0}
                              onClick={() => moveImage(index, index - 1)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-paper text-mute disabled:opacity-35"
                            >
                              <ArrowUp size={14} />
                            </button>
                          </AdminTip>
                          <AdminTip label="Move down">
                            <button
                              type="button"
                              aria-label="Move image down"
                              disabled={index === product.images.length - 1}
                              onClick={() => moveImage(index, index + 1)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-paper text-mute disabled:opacity-35"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </AdminTip>
                        </div>
                        <AdminTip label="Remove photo">
                          <button
                            type="button"
                            aria-label="Remove photo"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-paper text-mute hover:text-ink"
                            onClick={() => void removeImage(index)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </AdminTip>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-mute">No photos yet. First upload becomes the featured image.</p>
            )}
          </StudioPanel>

          <StudioPanel title="Pricing, inventory & weight" hint="Sizes, stock, and shipping weight">
            <p className="text-xs text-mute">
              For sizes like 250 g and 400 g, set Weight on each row. Shipping uses that size × quantity, then adds packing once (default 40 g).
            </p>

            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f7f7f6] text-[11px] uppercase tracking-[0.12em] text-mute">
                  <tr>
                    <th className="px-3 py-3 font-medium">Option</th>
                    <th className="px-3 py-3 font-medium">Selling price</th>
                    <th className="px-3 py-3 font-medium">MRP</th>
                    <th className="px-3 py-3 font-medium">Quantity</th>
                    <th className="px-3 py-3 font-medium">Weight</th>
                    <th className="px-3 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((variant, index) => (
                    <tr key={variant.id} className="border-t border-line bg-paper">
                      <td className="px-3 py-2">
                        <input
                          id={`variant-${variant.id}-option`}
                          aria-label="Option"
                          value={variant.label}
                          onChange={(event) => updateVariant(product, setProduct, index, { label: event.target.value })}
                          className={`${adminControl.input} min-w-[6rem]`}
                          placeholder="200 g"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          id={`variant-${variant.id}-price`}
                          aria-label="Selling price"
                          inputMode="numeric"
                          value={String(variant.price || "")}
                          onChange={(event) => updateVariant(product, setProduct, index, { price: Number(event.target.value) || 0 })}
                          className={`${adminControl.input} min-w-[5rem]`}
                          placeholder="300"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          id={`variant-${variant.id}-mrp`}
                          aria-label="MRP"
                          inputMode="numeric"
                          value={variant.compareAtPrice ? String(variant.compareAtPrice) : ""}
                          onChange={(event) =>
                            updateVariant(product, setProduct, index, {
                              compareAtPrice: event.target.value ? Number(event.target.value) : undefined,
                            })
                          }
                          className={`${adminControl.input} min-w-[5rem]`}
                          placeholder="340"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          id={`variant-${variant.id}-qty`}
                          aria-label="Quantity"
                          inputMode="numeric"
                          value={String(variant.stock)}
                          onChange={(event) => updateVariant(product, setProduct, index, { stock: Number(event.target.value) || 0 })}
                          className={`${adminControl.input} min-w-[4rem]`}
                          placeholder="20"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          id={`variant-${variant.id}-weight`}
                          aria-label="Weight"
                          inputMode="numeric"
                          value={variant.weightGrams ? String(variant.weightGrams) : ""}
                          onChange={(event) =>
                            updateVariant(product, setProduct, index, {
                              weightGrams: event.target.value.trim()
                                ? Math.round(Number(event.target.value) || 0) || undefined
                                : undefined,
                            })
                          }
                          className={`${adminControl.input} min-w-[4rem]`}
                          placeholder="250"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <AdminTip label="Delete option">
                          <button
                            type="button"
                            aria-label="Delete option"
                            disabled={product.variants.length <= 1}
                            onClick={() => set("variants", product.variants.filter((_, item) => item !== index))}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-mute transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Trash2 size={15} />
                          </button>
                        </AdminTip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <AdminTip label="Add option">
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 border border-line px-4 text-sm text-ink transition hover:bg-[#ffffff]"
                onClick={() =>
                  set("variants", [
                    ...product.variants,
                    {
                      id: `opt-${Date.now()}`,
                      label: "",
                      price: product.price || 0,
                      stock: 0,
                      weightGrams: product.weightGrams || undefined,
                    },
                  ])
                }
              >
                <Plus size={16} />
                Add option
              </button>
            </AdminTip>

            <label className="block text-sm">
              Default product weight (grams)
              <input
                type="number"
                min={1}
                max={30000}
                value={product.weightGrams || ""}
                onChange={(event) => set("weightGrams", Math.round(Number(event.target.value) || 0))}
                className={`mt-1.5 ${adminControl.input}`}
              />
              <span className="mt-2 block text-xs text-mute">
                Fallback when a row has no weight. Prefer Weight on each option.
              </span>
            </label>
          </StudioPanel>

          <StudioPanel
            title="Formula marks"
            hint="Trust strip on the product page — plant-based, cruelty-free, and Made in India on by default"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {PRODUCT_CLAIMS.map((claim) => {
                const Icon = PRODUCT_CLAIM_ICONS[claim.id];
                const checked = enabledClaims.has(claim.id);
                return (
                  <label
                    key={claim.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#ffffff] px-4 py-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={(event) =>
                        set("claims", toggleProductClaim(product.claims, claim.id, event.target.checked))
                      }
                    />
                    <span className="flex min-w-0 items-start gap-2.5">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-line bg-paper text-mute">
                        <Icon size={15} strokeWidth={1.4} aria-hidden />
                      </span>
                      <span>
                        <span className="block font-medium">{claim.label}</span>
                        <span className="mt-0.5 block text-xs text-mute">
                          {claim.defaultEnabled ? "Default on for every product" : "Optional — turn on when it applies"}
                        </span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </StudioPanel>

          <StudioPanel title="Visibility" hint="Where this product appears in the store" defaultOpen={true}>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["active", "Active", "Visible in the shop"],
                ["featured", "Featured", "Highlight in featured areas"],
                ["bestseller", "Bestseller", "Show in bestsellers"],
                ["newArrival", "New arrival", "Mark as new"],
              ] as const).map(([key, label, note]) => (
                <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#ffffff] px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={product[key]}
                    onChange={(event) => set(key, event.target.checked)}
                  />
                  <span>
                    <span className="block font-medium">{label}</span>
                    <span className="mt-0.5 block text-xs text-mute">{note}</span>
                  </span>
                </label>
              ))}
            </div>
          </StudioPanel>

          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-[#fdf4f2] px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <AdminStickyActions note="Changes go live on the shop when you save.">
            <AdminTip label="Save product">
              <button type="submit" className={adminBtn.primary}>
                <Save size={16} strokeWidth={2} />
                Save product
              </button>
            </AdminTip>
            {initial ? (
              <AdminTip label={`Delete ${initial.name}`}>
                <button
                  type="button"
                  className={adminBtn.danger}
                  onClick={async () => {
                    if (!window.confirm(`Delete “${initial.name}”? This cannot be undone.`)) return;
                    await store.deleteProduct(initial.id);
                    router.push("/admin/products");
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </AdminTip>
            ) : null}
          </AdminStickyActions>
        </div>

        <div className="order-first xl:order-none xl:sticky xl:top-4">
          <ProductDraftPreview product={product} />
        </div>
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

function AdminField({
  label,
  value,
  onChange,
  id: idProp,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const id = idProp || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label htmlFor={id} className="block text-sm">
      {label}
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`mt-1.5 ${adminControl.input}`} />
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
  const blank = (): Category => ({ id: "", name: "", description: "", image: "", imageAlt: "", order: store.categories.length });
  const [draft, setDraft] = useState<Category>(blank());
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<"image" | "imageAlt" | null>(null);
  const editorRef = useRef<HTMLFormElement | null>(null);
  const editingExisting = store.categories.some((category) => category.id === draft.id && draft.id);

  function openEditor(category?: Category) {
    setDraft(category ? category : blank());
    setError("");
    window.requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      const nameInput = editorRef.current?.querySelector<HTMLInputElement>("input");
      nameInput?.focus({ preventScroll: true });
    });
  }

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

  const productCount = (categoryId: string) => store.products.filter((product) => product.categoryId === categoryId).length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Categories"
        purpose="Shop groups like Body Care or Candles. Customers use these to browse."
        action={
          editingExisting ? (
            <AdminTip label="New category">
              <button
                type="button"
                onClick={() => openEditor()}
                className={adminBtn.secondary}
              >
                New category
              </button>
            </AdminTip>
          ) : null
        }
      />

      {store.categories.length === 0 ? (
        <AdminEmptyState
          title="No categories yet"
          body="Create a group in the form below so products can be organised in the shop."
        />
      ) : (
        <ul className="space-y-3">
          {store.categories.map((category, index) => {
            const selected = draft.id === category.id;
            return (
              <li
                key={category.id}
                className={`rounded-2xl border bg-paper p-4 transition ${selected ? "border-ink shadow-sm" : "border-line"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="relative block size-16 shrink-0 overflow-hidden rounded-xl bg-[#f7f7f6]">
                      {category.image ? (
                        <Media src={category.image} alt="" sizes="64px" className="object-cover" />
                      ) : (
                        <span className="grid h-full place-items-center text-mute"><ImagePlus size={18} /></span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-ink">{category.name}</p>
                        {statusPill("mute", `${productCount(category.id)} products`)}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-mute">{category.description || "No description"}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-mute">{category.id}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminTip label="Move up">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() => void store.moveCategory(category.id, -1)}
                        className="inline-flex h-8 w-8 items-center justify-center border border-line disabled:opacity-40"
                      >
                        <ArrowUp size={14} />
                      </button>
                    </AdminTip>
                    <AdminTip label="Move down">
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={index === store.categories.length - 1}
                        onClick={() => void store.moveCategory(category.id, 1)}
                        className="inline-flex h-8 w-8 items-center justify-center border border-line disabled:opacity-40"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </AdminTip>
                    <AdminTip label={`Edit ${category.name}`}>
                      <button
                        type="button"
                        onClick={() => openEditor(category)}
                        className={adminBtn.row}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </AdminTip>
                    <AdminTip label={`Delete ${category.name}`}>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Delete “${category.name}”? Products keep their category id until you reassign them.`)) return;
                          setError((await store.deleteCategory(category.id)).message || "");
                          if (draft.id === category.id) setDraft(blank());
                        }}
                        className={adminBtn.rowDanger}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </AdminTip>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-10 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] xl:items-start">
        <form
          ref={editorRef}
          id="category-editor"
          className="scroll-mt-24 space-y-5 rounded-2xl border border-line bg-paper p-6"
          onSubmit={async (event) => {
            event.preventDefault();
            const isNew = !store.categories.some((category) => category.id === draft.id);
            const result = await store.saveCategory({ ...draft, id: slugify(draft.id || draft.name), order: draft.order ?? store.categories.length }, isNew);
            setError(result.message || "");
            if (result.ok) setDraft(blank());
          }}
        >
          <div>
            <p className="eyebrow text-mute">{editingExisting ? "Edit category" : "New category"}</p>
            <p className="mt-1 text-sm text-mute">Upload images, then save. Preview updates as you type.</p>
          </div>
          <AdminField label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <AdminField label="Slug" value={draft.id} onChange={(id) => setDraft({ ...draft, id })} />
          <label className="block text-sm">
            Description
            <textarea
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              className={`mt-1.5 ${adminControl.textarea}`}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ["image", "Primary image"] as const,
              ["imageAlt", "Second image"] as const,
            ]).map(([field, label]) => (
              <div key={field} className="space-y-2">
                <p className="text-sm">{label}</p>
                <label className="relative flex aspect-[4/5] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-stone bg-[#ffffff]">
                  {draft[field] ? (
                    <Media src={draft[field]} alt="" sizes="220px" className="object-cover" />
                  ) : (
                    <span className="px-3 text-center text-xs text-mute">
                      {uploading === field ? "Uploading…" : "Drop or browse"}
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={Boolean(uploading)}
                    className="sr-only"
                    onChange={(event) => void onUpload(event.target.files, field)}
                  />
                </label>
                <AdminField
                  label={`${label} URL`}
                  value={draft[field]}
                  onChange={(value) => setDraft({ ...draft, [field]: value })}
                />
              </div>
            ))}
          </div>
          {error ? <p role="status" className="text-sm text-red-700">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <AdminTip label={editingExisting ? "Update category" : "Save category"}>
              <button type="submit" className={adminBtn.primary}>
                {editingExisting ? "Update category" : "Save category"}
              </button>
            </AdminTip>
            {editingExisting ? (
              <AdminTip label="Cancel edit">
                <button
                  type="button"
                  className="h-12 px-4 text-[11px] uppercase tracking-[0.16em] text-mute"
                  onClick={() => {
                    setDraft(blank());
                    setError("");
                  }}
                >
                  Cancel
                </button>
              </AdminTip>
            ) : null}
          </div>
        </form>
        <div className="order-first xl:order-none xl:sticky xl:top-4">
          <CategoryDraftPreview category={draft} />
        </div>
      </div>
    </div>
  );
}

function orderStatusTone(status: string): "ok" | "warn" | "mute" | "danger" | "info" {
  if (status === "delivered" || status === "captured" || status === "confirmed") return "ok";
  if (status === "cancelled" || status === "failed" || status === "exception") return "danger";
  if (status === "shipped" || status === "in_transit" || status === "booked" || status === "packed") return "info";
  if (status === "pending_payment" || status === "pending" || status === "refund_pending") return "warn";
  return "mute";
}

export function OrderIndex() {
  const store = useStore();
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [shipment, setShipment] = useState("all");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const open = store.orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;
    const awaitingPay = store.orders.filter((order) => order.status === "pending_payment" || order.paymentState === "pending").length;
    const toShip = store.orders.filter((order) => ["confirmed", "packed", "placed"].includes(order.status)).length;
    return { total: store.orders.length, open, awaitingPay, toShip };
  }, [store.orders]);

  const orders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return store.orders.filter((order) => {
      if (status !== "all" && order.status !== status) return false;
      if (payment !== "all" && order.paymentState !== payment) return false;
      if (shipment !== "all" && (order.shipment?.state || "not_created") !== shipment) return false;
      if (!needle) return true;
      return `${order.number} ${order.customerName} ${order.email} ${order.phone}`.toLowerCase().includes(needle);
    });
  }, [store.orders, status, payment, shipment, query]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Orders"
        purpose="Customer checkouts land here. Open an order to pack, ship, or fix payment."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "All orders", value: stats.total },
          { label: "Open", value: stats.open },
          { label: "Awaiting payment", value: stats.awaitingPay },
          { label: "Ready to ship", value: stats.toShip },
        ].map((item) => (
          <AdminStatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <AdminFilterBar>
        <label className="min-w-[14rem] flex-1 text-sm">
          Search
          <span className={`mt-1.5 flex items-center gap-2 ${adminControl.input}`}>
            <Search size={14} className="shrink-0 text-mute" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Order number, name, email, phone"
              className="h-full w-full bg-transparent text-sm outline-none"
            />
          </span>
        </label>
        <label className="text-sm">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={`mt-1.5 ${adminControl.select}`}>
            {["all", "pending_payment", "placed", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((item) => (
              <option key={item} value={item}>{item === "all" ? "All" : humanLabel(item)}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Payment
          <select value={payment} onChange={(event) => setPayment(event.target.value)} className={`mt-1.5 ${adminControl.select}`}>
            {["all", "pending", "captured", "failed", "refund_pending", "refunded"].map((item) => (
              <option key={item} value={item}>{item === "all" ? "All" : humanLabel(item)}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Shipment
          <select value={shipment} onChange={(event) => setShipment(event.target.value)} className={`mt-1.5 ${adminControl.select}`}>
            {["all", "not_created", "pending", "booked", "in_transit", "delivered", "exception", "unknown"].map((item) => (
              <option key={item} value={item}>{item === "all" ? "All" : humanLabel(item)}</option>
            ))}
          </select>
        </label>
      </AdminFilterBar>

      {orders.length === 0 ? (
        <AdminEmptyState
          icon={<ShoppingBag size={28} strokeWidth={1.4} />}
          title={store.orders.length ? "No orders match" : "No orders yet"}
          body={
            store.orders.length
              ? "Clear search or filters to see every order."
              : "When someone checks out on the shop, the order shows up here."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-mute">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Placed</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Shipment</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const shipState = order.shipment?.state || "not_created";
                  return (
                    <tr key={order.id} className="border-b border-line/70 align-middle transition-colors duration-200 last:border-b-0 hover:bg-cream/50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                          {order.number}
                        </Link>
                        <p className="mt-0.5 text-xs text-mute">{order.items.length} item{order.items.length === 1 ? "" : "s"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{order.customerName}</p>
                        <p className="text-xs text-mute">{order.email}</p>
                      </td>
                      <td className="px-4 py-3 text-mute">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-3">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3">{statusPill(orderStatusTone(order.status), humanLabel(order.status))}</td>
                      <td className="px-4 py-3">
                        {order.paymentState
                          ? statusPill(orderStatusTone(order.paymentState), humanLabel(order.paymentState))
                          : <span className="text-mute">—</span>}
                      </td>
                      <td className="px-4 py-3">{statusPill(orderStatusTone(shipState), humanLabel(shipState))}</td>
                      <td className="px-4 py-3 text-right">
                        <AdminTip label={`Open order ${order.number}`}>
                          <Link href={`/admin/orders/${order.id}`} className={adminBtn.row}>
                            Open
                          </Link>
                        </AdminTip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-4 py-3 text-xs text-mute">
            Showing {orders.length} of {store.orders.length} orders
          </p>
        </div>
      )}
    </div>
  );
}

export function OrderDetail({ id }: { id: string }) {
  const store = useStore();
  const order = store.orders.find((item) => item.id === id);
  if (!store.ready) {
    return (
      <div>
        <AdminPageHeaderSkeleton />
        <AdminFormSkeleton fields={4} />
      </div>
    );
  }
  if (!order) {
    return (
      <AdminEmptyState
        title="Order not found"
        body="That order id is missing or was removed. Go back to the list and open another order."
        action={
          <AdminTip label="Back to orders">
            <Link href="/admin/orders" className={adminBtn.secondary}>
              <ArrowLeft size={14} /> Back to orders
            </Link>
          </AdminTip>
        }
      />
    );
  }

  const shipState = order.shipment?.state || "not_created";

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/orders" className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-mute hover:text-ink">
          <ArrowLeft size={14} /> Orders
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{order.number}</h1>
            <p className="mt-2 text-sm text-mute">
              {formatDate(order.createdAt)} · {order.items.length} item{order.items.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusPill(orderStatusTone(order.status), humanLabel(order.status))}
            {order.paymentState ? statusPill(orderStatusTone(order.paymentState), `Pay · ${humanLabel(order.paymentState)}`) : null}
            {statusPill(orderStatusTone(shipState), `Ship · ${humanLabel(shipState)}`)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Customer</p>
          <p className="mt-3 font-medium">{order.customerName}</p>
          <p className="mt-1 text-sm text-mute">{order.email}</p>
          <p className="text-sm text-mute">{order.phone || "No phone"}</p>
        </section>
        <section className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Ship to</p>
          <p className="mt-3 text-sm leading-6">
            {order.address.line1}
            {order.address.line2 ? <>, {order.address.line2}</> : null}
            <br />
            {order.address.city} {order.address.postal}
            <br />
            {order.address.country}
          </p>
        </section>
        <section className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Order status</p>
          <label className="mt-3 block text-sm">
            Lifecycle
            <select
              value={order.status}
              disabled={Boolean(order.shipment?.awb)}
              onChange={(event) => store.updateOrderStatus(order.id, event.target.value as OrderStatus)}
              className={`mt-1.5 ${adminControl.input} disabled:opacity-60`}
            >
              {["pending_payment", "placed", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((status) => (
                <option key={status} value={status}>{humanLabel(status)}</option>
              ))}
            </select>
          </label>
          {order.shipment?.awb ? (
            <p className="mt-3 text-xs text-mute">Waybill {order.shipment.awb} — delivery status follows Delhivery.</p>
          ) : (
            <p className="mt-3 text-xs text-mute">Update status here, or book shipping below when ready.</p>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-line bg-paper">
        <div className="border-b border-line px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Items</p>
        </div>
        <ul>
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4 last:border-b-0">
              <div className="flex min-w-0 items-center gap-3">
                <span className="relative block size-14 shrink-0 overflow-hidden rounded-xl bg-[#f7f7f6]">
                  {item.image ? <Media src={item.image} alt="" sizes="56px" className="object-cover" /> : null}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-mute">{item.variantLabel} · Qty {item.quantity}</p>
                </div>
              </div>
              <p className="shrink-0">{formatPrice(item.price * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-line px-5 py-4 text-sm">
          <div className="flex justify-between text-mute"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          {order.discount ? <div className="flex justify-between text-mute"><span>Discount</span><span>−{formatPrice(order.discount)}</span></div> : null}
          <div className="flex justify-between text-mute"><span>Shipping</span><span>{formatPrice(order.shipping)}</span></div>
          {order.platformFee ? <div className="flex justify-between text-mute"><span>Platform fee</span><span>{formatPrice(order.platformFee)}</span></div> : null}
          <div className="flex justify-between pt-2 font-serif text-2xl"><span>Total</span><span>{formatPrice(order.total)}</span></div>
        </div>
      </section>

      <FulfilmentPanel orderId={order.id} initial={order} />
    </div>
  );
}

export function CustomerIndex() {
  const store = useStore();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const customers = useMemo(() => {
    const list = store.users.filter((user) => user.role === "customer");
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (customer) =>
        customer.name.toLowerCase().includes(needle) ||
        customer.email.toLowerCase().includes(needle) ||
        (customer.phone || "").toLowerCase().includes(needle),
    );
  }, [store.users, query]);

  const withOrders = useMemo(
    () =>
      customers.map((customer) => ({
        customer,
        orderCount: store.orders.filter((order) => order.userId === customer.id || order.email === customer.email).length,
      })),
    [customers, store.orders],
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Customers"
        purpose="People who signed in or bought something. Open a row to see addresses and past orders."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard
          label="Customers"
          value={store.users.filter((user) => user.role === "customer").length}
        />
        <div className="rounded-2xl border border-line bg-paper px-5 py-4 sm:col-span-2">
          <label className="block text-sm">
            Search
            <span className={`mt-1.5 flex items-center gap-2 ${adminControl.input}`}>
              <Search size={16} className="text-mute" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, email, or phone"
                className="h-full w-full bg-transparent text-sm outline-none"
              />
            </span>
          </label>
        </div>
      </div>

      {withOrders.length ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line text-[11px] uppercase tracking-[0.12em] text-mute">
              <tr>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Orders</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {withOrders.map(({ customer, orderCount }) => (
                <tr key={customer.id} className="border-t border-line transition-colors duration-200 hover:bg-cream/50">
                  <td className="px-5 py-4">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <Link href={`/admin/customers/${customer.id}`} className="font-medium hover:underline">
                        {customer.name || customer.email || customer.phone || customer.id}
                      </Link>
                      {customer.blocked ? (
                        <span className="inline-flex rounded bg-[#8b0000] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-white">
                          Blocked
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-mute">
                    <p>{customer.email}</p>
                    <p className="text-xs">{customer.phone || "No phone"}</p>
                  </td>
                  <td className="px-5 py-4">{orderCount}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <AdminTip label={`Open ${customer.name || customer.email || "customer"}`}>
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-ink bg-ink px-2.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-[#2a2420] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                          aria-label={`Open ${customer.name || customer.email || "customer"}`}
                        >
                          <Eye size={14} aria-hidden className="text-white" />
                        </Link>
                      </AdminTip>
                      <AdminTip label={customer.blocked ? "Unblock" : "Block"}>
                        <button
                          type="button"
                          className={
                            customer.blocked
                              ? "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#2f6b3c] bg-[#2f6b3c] px-2.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-[#265732] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
                              : "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#8b0000] bg-[#8b0000] px-2.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-[#6e0000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
                          }
                          aria-label={customer.blocked ? "Unblock" : "Block"}
                          disabled={busyId === customer.id}
                          onClick={async () => {
                            const next = !customer.blocked;
                            setBusyId(customer.id);
                            await store.setCustomerBlocked(customer.id, next);
                            setBusyId(null);
                          }}
                        >
                          {customer.blocked ? (
                            <ShieldCheck size={14} aria-hidden className="text-white" />
                          ) : (
                            <Ban size={14} aria-hidden className="text-white" />
                          )}
                        </button>
                      </AdminTip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <AdminEmptyState
          title={query ? "No matching customers" : "No customers yet"}
          body={
            query
              ? "Try a different name, email, or phone."
              : "Customers appear after someone signs in or places an order on the shop."
          }
        />
      )}
    </div>
  );
}

export function CustomerDetail({ id }: { id: string }) {
  const store = useStore();
  const [busy, setBusy] = useState(false);
  const customer = store.users.find((user) => user.id === id);
  if (!store.ready) {
    return (
      <div>
        <AdminPageHeaderSkeleton />
        <AdminFormSkeleton fields={3} />
      </div>
    );
  }
  if (!customer) {
    return (
      <AdminEmptyState
        title="Customer not found"
        body="That customer id is missing. Go back to the list and open another person."
        action={
          <AdminTip label="Back to customers">
            <Link href="/admin/customers" className={adminBtn.secondary}>
              <ArrowLeft size={14} /> Back to customers
            </Link>
          </AdminTip>
        }
      />
    );
  }
  const orders = store.orders.filter((order) => order.userId === customer.id || order.email === customer.email);
  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/customers" className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-mute hover:text-ink">
          <ArrowLeft size={14} /> Customers
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="inline-flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
              {customer.name || customer.email || customer.phone || customer.id}
              {customer.blocked ? (
                <span className="inline-flex rounded bg-[#8b0000] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-white">
                  Blocked
                </span>
              ) : null}
            </h1>
            <p className="mt-2 text-sm text-mute">{customer.email} · {customer.phone || "No phone"}</p>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <AdminTip label={customer.blocked ? "Unblock" : "Block"}>
              <button
                type="button"
                className={
                  customer.blocked
                    ? "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#2f6b3c] bg-[#2f6b3c] px-2.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-[#265732] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
                    : "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#8b0000] bg-[#8b0000] px-2.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-[#6e0000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
                }
                aria-label={customer.blocked ? "Unblock" : "Block"}
                disabled={busy}
                onClick={async () => {
                  const next = !customer.blocked;
                  setBusy(true);
                  await store.setCustomerBlocked(customer.id, next);
                  setBusy(false);
                }}
              >
                {customer.blocked ? (
                  <ShieldCheck size={14} aria-hidden className="text-white" />
                ) : (
                  <Ban size={14} aria-hidden className="text-white" />
                )}
              </button>
            </AdminTip>
            {statusPill("info", `${orders.length} order${orders.length === 1 ? "" : "s"}`)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Addresses" hint="Saved delivery addresses" defaultOpen>
          {customer.addresses.length ? (
            <ul className="space-y-3">
              {customer.addresses.map((address) => (
                <li key={address.id} className="rounded-xl border border-line bg-[#ffffff] px-4 py-3 text-sm leading-6">
                  {address.line1}
                  {address.line2 ? <>, {address.line2}</> : null}
                  <br />
                  {address.city} {address.postal}
                  <br />
                  {address.country}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-mute">No saved addresses.</p>
          )}
        </AdminPanel>

        <AdminPanel title="Orders" hint="Orders linked to this customer" defaultOpen>
          {orders.length ? (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {orders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                      {order.number}
                    </Link>
                    <p className="mt-0.5 text-xs text-mute">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusPill(orderStatusTone(order.status), humanLabel(order.status))}
                    <span className="font-medium">{formatPrice(order.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-mute">No orders yet.</p>
          )}
        </AdminPanel>
      </div>
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

  const previewContent = useMemo<HeroContent>(
    () => ({
      offer: { ...draft, chips: parseChipList(chipsText) },
      evergreen: evergreen.map((slide, index) => ({
        ...slide,
        chips: parseChipList(evergreenChips[index] || ""),
      })),
    }),
    [draft, chipsText, evergreen, evergreenChips],
  );

  if (loading) return <AdminEditorSkeleton />;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Homepage hero"
        purpose="These are the first slides shoppers see on the homepage."
      />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] xl:items-start">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setError("");
            setMessage("");
            const chips = parseChipList(chipsText);
            const offer: HeroOffer = { ...draft, chips };
            const slides = evergreen.map((slide, index) => ({
              ...slide,
              chips: parseChipList(evergreenChips[index] || ""),
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
          <AdminPanel
            title="Campaign slide"
            hint="Optional sale or festival slide. Turn it off to hide it without deleting the copy."
            defaultOpen
          >
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
                className={`mt-1.5 ${adminControl.input}`}
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
          </AdminPanel>

          {evergreen.map((slide, index) => (
            <AdminPanel
              key={slide.id}
              title={`Product slide ${index + 1}`}
              hint={slide.label || "Always-on homepage slide"}
              defaultOpen={index === 0}
            >
              <AdminField label="Pill" value={slide.pill} onChange={(pill) => patchSlide(index, { pill })} />
              <AdminField label="Title line 1" value={slide.titleLine1} onChange={(titleLine1) => patchSlide(index, { titleLine1 })} />
              <AdminField label="Title line 2" value={slide.titleLine2} onChange={(titleLine2) => patchSlide(index, { titleLine2 })} />
              <label className="block text-sm">
                Note
                <textarea
                  value={slide.note}
                  onChange={(event) => patchSlide(index, { note: event.target.value })}
                  rows={2}
                  className={`mt-1.5 ${adminControl.input}`}
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
            </AdminPanel>
          ))}

          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-[#fdf4f2] px-4 py-3 text-sm text-red-700">{error}</p>
          ) : null}
          {message ? (
            <p role="status" className="rounded-xl border border-[#cfe0c8] bg-[#f3f8f1] px-4 py-3 text-sm text-[#3d5a3a]">{message}</p>
          ) : null}
          <AdminStickyActions note="Homepage updates after you save.">
            <AdminTip label={saving ? "Saving…" : "Save hero"}>
              <button type="submit" disabled={saving} className={adminBtn.primary}>
                {saving ? "Saving…" : "Save hero"}
              </button>
            </AdminTip>
          </AdminStickyActions>
        </form>

        <div className="order-first xl:order-none xl:sticky xl:top-4">
          <HeroDraftPreview content={previewContent} />
        </div>
      </div>
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

  if (loading) return <AdminEditorSkeleton />;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Website photos"
        purpose="Change marketing photos on home, shop, login, and checkout — not product galleries."
      />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] xl:items-start">
        <form
          className="space-y-4"
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
                defaultOpen: true,
              },
              {
                title: "Shop page banners",
                hint: "Top banner and lower story banner on the shop page.",
                keys: ["shopHero", "shopEditorial"] as const,
                defaultOpen: false,
              },
              {
                title: "Sign-in, checkout & wishlist",
                hint: "Backgrounds on login, checkout header, and wishlist page.",
                keys: ["authBackground", "checkoutBanner", "wishlistBanner"] as const,
                defaultOpen: false,
              },
            ] as const
          ).map((group) => (
            <AdminPanel key={group.title} title={group.title} hint={group.hint} defaultOpen={group.defaultOpen}>
              {SITE_MEDIA_SLOTS.filter((slot) => (group.keys as readonly string[]).includes(slot.key)).map((slot) => {
                const value = draft[slot.key];
                return (
                  <div key={slot.key} className="space-y-3 rounded-xl border border-line bg-[#ffffff] p-4">
                    <div>
                      <p className="font-medium">{slot.label}</p>
                      <p className="text-sm text-mute">{slot.hint}</p>
                    </div>
                    {value ? (
                      <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-line bg-[#f7f7f6]">
                        <Media src={value} alt="" sizes="320px" className="object-cover" />
                      </div>
                    ) : null}
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
                  </div>
                );
              })}
            </AdminPanel>
          ))}

          <AdminPanel
            title="Homepage category strip"
            hint="Circular tiles under the homepage hero (Body Butter, Soap, Candles, and so on)."
            defaultOpen={false}
          >
            {draft.categoryStrip.map((item, index) => (
              <div key={item.id} className="space-y-3 rounded-xl border border-line bg-[#ffffff] p-4">
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
              </div>
            ))}
          </AdminPanel>

          <AdminPanel
            title="Homepage reviews"
            hint="Quotes on the homepage. Prefer linking each card to a product so the live product photo shows."
            defaultOpen={false}
          >
            {draft.reviews.map((review, index) => (
              <div key={review.id} className="space-y-3 rounded-xl border border-line bg-[#ffffff] p-4">
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
                    className={`mt-1.5 ${adminControl.input}`}
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
                      className={`mt-1.5 ${adminControl.input}`}
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
          </AdminPanel>

          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-[#fdf4f2] px-4 py-3 text-sm text-red-700">{error}</p>
          ) : null}
          {message ? (
            <p role="status" className="rounded-xl border border-[#cfe0c8] bg-[#f3f8f1] px-4 py-3 text-sm text-[#3d5a3a]">{message}</p>
          ) : null}
          <AdminStickyActions note="Website photos update after you save.">
            <AdminTip label={saving ? "Saving…" : "Save photos"}>
              <button type="submit" disabled={saving} className={adminBtn.primary}>
                {saving ? "Saving…" : "Save photos"}
              </button>
            </AdminTip>
          </AdminStickyActions>
        </form>

        <div className="order-first xl:order-none xl:sticky xl:top-4">
          <SiteMediaDraftPreview media={draft} />
        </div>
      </div>
    </div>
  );
}

export { BrandManager } from "@/components/admin/BrandManager";

export function OfferManager() {
  const store = useStore();
  const blank: Coupon = { id: "", code: "", type: "percent", value: 10, scope: "order", active: true, label: "", productIds: [] };
  const [draft, setDraft] = useState<Coupon>(blank);
  const [error, setError] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const editing = Boolean(draft.id && store.coupons.some((coupon) => coupon.id === draft.id));
  const activeCount = store.coupons.filter((coupon) => coupon.active).length;
  const selectedProductIds = couponProductIds(draft);

  const filteredProducts = useMemo(() => {
    const needle = productQuery.trim().toLowerCase();
    return store.products.filter((product) => {
      if (!needle) return true;
      return product.name.toLowerCase().includes(needle) || product.id.toLowerCase().includes(needle);
    });
  }, [store.products, productQuery]);

  const startEdit = (coupon: Coupon) => {
    const ids = couponProductIds(coupon);
    setDraft({
      ...coupon,
      productIds: ids,
      productId: ids[0],
    });
    setProductQuery("");
    setError("");
  };

  const toggleProduct = (productId: string) => {
    const next = selectedProductIds.includes(productId)
      ? selectedProductIds.filter((id) => id !== productId)
      : [...selectedProductIds, productId];
    setDraft({
      ...draft,
      productIds: next,
      productId: next[0],
    });
  };

  const scopeHint =
    draft.scope === "order"
      ? "Applies to the whole bag at checkout."
      : draft.scope === "product"
        ? "Applies only to the products you select."
        : "Applies to items in one category.";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Discount codes"
        purpose="Codes shoppers type at checkout (for example WINTER20)."
      />

      <div className="flex flex-wrap gap-2">
        {[
          ["Codes", store.coupons.length],
          ["Active", activeCount],
          ["Paused", store.coupons.length - activeCount],
        ].map(([label, value]) => (
          <div key={label} className="inline-flex min-w-[5.5rem] items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-mute">{label}</span>
            <span className="text-sm font-medium tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] xl:items-start">
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <div className="border-b border-line px-5 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-mute">All codes</p>
          </div>
          {store.coupons.length ? (
            <ul className="divide-y divide-line">
              {store.coupons.map((coupon) => {
                const ids = couponProductIds(coupon);
                return (
                  <li key={coupon.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium tracking-wide">{coupon.code}</p>
                        {coupon.active ? statusPill("ok", "Active") : statusPill("mute", "Paused")}
                      </div>
                      <p className="mt-1 text-sm text-mute">
                        {coupon.label || "No label"} · {humanLabel(coupon.scope)}
                        {coupon.scope === "product" && ids.length ? ` · ${ids.length} product${ids.length === 1 ? "" : "s"}` : ""}
                        {" · "}
                        {coupon.type === "percent" ? `${coupon.value}%` : formatPrice(coupon.value)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <AdminTip label={`Edit ${coupon.code}`}>
                        <button type="button" onClick={() => startEdit(coupon)} className={adminBtn.row}>
                          <Pencil size={13} /> Edit
                        </button>
                      </AdminTip>
                      <AdminTip label={`Delete ${coupon.code}`}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Delete code “${coupon.code}”?`)) return;
                            void store.deleteCoupon(coupon.id);
                            if (draft.id === coupon.id) {
                              setDraft(blank);
                              setProductQuery("");
                            }
                          }}
                          className={adminBtn.rowDanger}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </AdminTip>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-10 text-sm text-mute">No discount codes yet. Fill the form on the right, then save to create your first code.</p>
          )}
        </div>

        <form
          className="overflow-hidden rounded-2xl border border-line bg-paper"
          onSubmit={async (event) => {
            event.preventDefault();
            if (draft.scope === "product" && selectedProductIds.length === 0) {
              setError("Select at least one product for a product discount.");
              return;
            }
            if (draft.scope === "category" && !draft.categoryId) {
              setError("Choose a category for a category discount.");
              return;
            }
            const isNew = !draft.id || !store.coupons.some((coupon) => coupon.id === draft.id);
            const payload: Coupon = {
              ...draft,
              id: draft.id || `coupon-${Date.now()}`,
              label: draft.label || draft.code,
              code: draft.code.trim().toUpperCase(),
              productIds: draft.scope === "product" ? selectedProductIds : undefined,
              productId: draft.scope === "product" ? selectedProductIds[0] : undefined,
              categoryId: draft.scope === "category" ? draft.categoryId : undefined,
            };
            const result = await store.saveCoupon(payload, isNew);
            setError(result.message || "");
            if (result.ok) {
              setDraft(blank);
              setProductQuery("");
            }
          }}
        >
          <div className="border-b border-line px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-mute">{editing ? "Edit code" : "New offer"}</p>
            <p className="mt-1 text-sm text-mute">{editing ? `Updating ${draft.code}` : "Customers enter this at checkout."}</p>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField
                label="Code"
                value={draft.code}
                onChange={(code) => setDraft({ ...draft, code: code.toUpperCase() })}
              />
              <AdminField label="Label" value={draft.label} onChange={(label) => setDraft({ ...draft, label })} />
            </div>

            <div>
              <p className="text-sm">Discount type</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([
                  ["percent", "Percentage"],
                  ["fixed", "Fixed ₹"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDraft({ ...draft, type: value })}
                    className={`h-10 rounded-xl border text-sm transition ${
                      draft.type === value ? "border-ink bg-ink text-paper" : "border-line bg-[#ffffff] text-ink hover:bg-[#f7f7f6]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <AdminField
              label={draft.type === "percent" ? "Percent off" : "Amount off (₹)"}
              value={String(draft.value || "")}
              onChange={(value) => setDraft({ ...draft, value: Number(value) || 0 })}
            />

            <div>
              <p className="text-sm">Applies to</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([
                  ["order", "Order"],
                  ["product", "Products"],
                  ["category", "Category"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        scope: value,
                        productIds: value === "product" ? selectedProductIds : [],
                        productId: value === "product" ? selectedProductIds[0] : undefined,
                        categoryId: value === "category" ? draft.categoryId : undefined,
                      })
                    }
                    className={`h-10 rounded-xl border text-sm transition ${
                      draft.scope === value ? "border-ink bg-ink text-paper" : "border-line bg-[#ffffff] text-ink hover:bg-[#f7f7f6]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-mute">{scopeHint}</p>
            </div>

            {draft.scope === "product" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Products</p>
                  <p className="text-xs text-mute">
                    {selectedProductIds.length
                      ? `${selectedProductIds.length} selected`
                      : "Select one or more"}
                  </p>
                </div>
                {selectedProductIds.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProductIds.map((id) => {
                      const product = store.products.find((item) => item.id === id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleProduct(id)}
                          className="inline-flex items-center gap-1 rounded-full border border-line bg-[#ffffff] px-2.5 py-1 text-xs transition hover:border-red-200 hover:text-red-700"
                        >
                          {product?.name || id}
                          <X size={12} aria-hidden />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-[#ffffff] px-3">
                  <Search size={15} className="text-mute" aria-hidden />
                  <input
                    value={productQuery}
                    onChange={(event) => setProductQuery(event.target.value)}
                    placeholder="Search products"
                    className="h-full w-full bg-transparent text-sm outline-none"
                  />
                </label>
                <ul className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
                  {filteredProducts.length ? (
                    filteredProducts.map((product) => {
                      const checked = selectedProductIds.includes(product.id);
                      return (
                        <li key={product.id}>
                          <label
                            className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition ${
                              checked ? "bg-[#f7f7f6]" : "hover:bg-[#ffffff]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProduct(product.id)}
                              className="size-4"
                            />
                            <span className="min-w-0 truncate">{product.name}</span>
                          </label>
                        </li>
                      );
                    })
                  ) : (
                    <li className="px-2 py-4 text-center text-xs text-mute">No products match that search.</li>
                  )}
                </ul>
              </div>
            ) : null}

            {draft.scope === "category" ? (
              <label className="block text-sm">
                Category
                <select
                  value={draft.categoryId ?? ""}
                  onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
                  className={`mt-1.5 ${adminControl.input}`}
                >
                  <option value="">Choose</option>
                  {store.categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#ffffff] px-4 py-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={draft.active}
                onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
              />
              <span>
                <span className="block font-medium">Active at checkout</span>
                <span className="mt-0.5 block text-xs text-mute">Paused codes stay saved but cannot be used.</span>
              </span>
            </label>

            {error ? (
              <p role="alert" className="rounded-xl border border-red-200 bg-[#fdf4f2] px-4 py-3 text-sm text-red-700">{error}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <AdminTip label={editing ? "Update offer" : "Save offer"}>
                <button type="submit" className={adminBtn.primary}>
                  <Save size={14} />
                  {editing ? "Update offer" : "Save offer"}
                </button>
              </AdminTip>
              {editing ? (
                <AdminTip label="Cancel edit">
                  <button
                    type="button"
                    className="h-11 border border-line px-4 text-[11px] uppercase tracking-[0.16em] text-mute transition hover:text-ink"
                    onClick={() => {
                      setDraft(blank);
                      setProductQuery("");
                      setError("");
                    }}
                  >
                    Cancel
                  </button>
                </AdminTip>
              ) : null}
            </div>
          </div>
        </form>
      </div>
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

function FulfilmentAction({
  title,
  hint,
  icon: Icon,
  onClick,
  busy = false,
  disabled = false,
  tone = "default",
}: {
  title: string;
  hint: string;
  icon: typeof RefreshCw;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: "default" | "primary" | "danger";
}) {
  const tones = {
    default: {
      card: "border-line bg-paper hover:border-[#d6cfc4] hover:bg-[#ffffff]",
      icon: "bg-[#f7f7f6] text-ink",
      title: "text-ink",
    },
    primary: {
      card: "border-ink/15 bg-ink text-paper hover:bg-[#2a2420]",
      icon: "bg-paper/15 text-paper",
      title: "text-paper",
    },
    danger: {
      card: "border-red-200 bg-[#fdf4f2] hover:border-red-300 hover:bg-[#faeae6]",
      icon: "bg-[#f6e4e1] text-red-700",
      title: "text-red-800",
    },
  } as const;
  const look = tones[tone];
  return (
    <AdminTip label={busy ? "Working…" : title} className="w-full">
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={`group flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${look.card}`}
    >
      <span className={`mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${look.icon}`}>
        {busy ? (
          <Loader2 size={18} strokeWidth={1.75} className="animate-spin" aria-hidden />
        ) : (
          <Icon size={18} strokeWidth={1.75} aria-hidden />
        )}
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-medium ${look.title}`}>{busy ? "Working…" : title}</span>
        <span className={`mt-1 block text-xs leading-5 ${tone === "primary" ? "text-paper/70" : "text-mute"}`}>
          {hint}
        </span>
      </span>
    </button>
    </AdminTip>
  );
}

function FulfilmentPanel({ orderId, initial }: { orderId: string; initial: Order }) {
  const [order, setOrder] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [labelSize, setLabelSize] = useState<"A4" | "4R">("4R");
  const [label, setLabel] = useState<ShippingLabelView | null>(null);

  async function run(action: string, extra: Record<string, unknown> = {}, busyKey = action) {
    setMessage("");
    setError("");
    setBusy(busyKey);
    if (action !== "shipping-label") setLabel(null);
    try {
      const response = await fetch("/api/admin/fulfilment", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ action, orderId, ...extra }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "Could not update fulfilment.");
        return;
      }
      if (body.order) setOrder(body.order);
      if (action === "shipping-label" && body.label) {
        setLabel(body.label);
        setMessage(
          body.label.kind === "link"
            ? "Delhivery returned a label link."
            : body.label.kind === "pdf"
              ? "Delhivery returned a PDF."
              : "Delhivery returned label data.",
        );
        return;
      }
      setMessage("Saved.");
    } catch {
      setError("Could not update fulfilment.");
    } finally {
      setBusy(null);
    }
  }

  const shipment = order.shipment;
  const shipState = shipment?.state || "not_created";
  const events = shipment?.events || [];
  const providerLabel = shipment?.provider || "manual";

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-paper">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Fulfilment</p>
          <p className="mt-1 text-sm text-mute">Book shipping, track the parcel, and print labels.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusPill(orderStatusTone(order.paymentState || "pending"), `Pay · ${humanLabel(order.paymentState || "—")}`)}
          {statusPill(orderStatusTone(shipState), `Ship · ${humanLabel(shipState)}`)}
          {statusPill("mute", providerLabel)}
          {shipment?.test ? statusPill("warn", "Test") : null}
        </div>
      </div>

      <div className="grid gap-3 border-b border-line p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-[#ffffff] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-mute">Waybill</p>
          <p className="mt-2 truncate font-medium">{shipment?.awb || "Not booked"}</p>
        </div>
        <div className="rounded-xl border border-line bg-[#ffffff] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-mute">Parcel weight</p>
          <p className="mt-2 font-medium">{shipment?.weightGrams ? `${shipment.weightGrams} g` : "—"}</p>
          {shipment?.weightGrams && shipment.packageData !== "product_weights" ? (
            <p className="mt-1 text-xs text-mute">Includes store fallback weight</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-line bg-[#ffffff] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-mute">Payment</p>
          <p className="mt-2 font-medium">{order.payment === "cod" ? "Cash on delivery" : humanLabel(order.payment || "prepaid")}</p>
          {order.payment === "cod" ? (
            <p className="mt-1 text-xs text-mute">{order.codCollection === "due" ? "Collection still due" : "COD does not apply"}</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-line bg-[#ffffff] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-mute">Last tracking</p>
          <p className="mt-2 font-medium">
            {shipment?.lastTrackingAt ? formatDate(shipment.lastTrackingAt) : events[0]?.at ? formatDate(events[0].at) : "—"}
          </p>
        </div>
      </div>

      {(shipment?.test || shipment?.lastError || error || message) ? (
        <div className="space-y-2 border-b border-line px-5 py-4">
          {shipment?.test ? (
            <p className="rounded-xl border border-[#e8d9b5] bg-[#f7f7f6] px-4 py-3 text-sm text-[#7a5a28]">
              Test shipment — not sent to Delhivery. Refresh tracking to add the next test event.
            </p>
          ) : null}
          {shipment?.lastError ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-[#fdf4f2] px-4 py-3 text-sm text-red-700">
              {shipment.lastError}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-[#fdf4f2] px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p role="status" className="rounded-xl border border-[#cfe0c8] bg-[#f3f8f1] px-4 py-3 text-sm text-[#3d5a3a]">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-b border-line px-5 py-5">
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-mute" aria-hidden />
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-mute">Tracking</p>
        </div>
        {events.length ? (
          <ol className="relative mt-4 space-y-0 border-l border-line pl-5">
            {events.map((event, index) => (
              <li key={`${event.at}-${event.providerStatus}-${index}`} className="relative pb-5 last:pb-0">
                <span
                  className={`absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full ring-4 ring-paper ${
                    index === 0 ? "bg-ink" : "bg-[#cfc6ba]"
                  }`}
                  aria-hidden
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{event.providerStatus || humanLabel(event.state)}</p>
                  <p className="text-xs text-mute">{formatDate(event.at)}</p>
                </div>
                <p className="mt-0.5 text-xs text-mute">
                  {humanLabel(event.state)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
                {event.instructions ? <p className="mt-1 text-xs text-mute">{event.instructions}</p> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-mute">No tracking events yet. Book a shipment or refresh after booking.</p>
        )}
      </div>

      {shipment?.awb && !shipment.test ? (
        <div className="border-b border-line px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-mute">Prepare for dispatch</p>
          <p className="mt-1 text-sm text-mute">
            Print or fetch label details for waybill {shipment.awb}.
          </p>
          <label className="mt-4 block max-w-xs text-sm">
            Label size
            <select
              value={labelSize}
              onChange={(event) => setLabelSize(event.target.value === "A4" ? "A4" : "4R")}
              className={`mt-1.5 ${adminControl.input}`}
            >
              <option value="4R">4R · 4×6 sticker</option>
              <option value="A4">A4 · full page</option>
            </select>
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FulfilmentAction
              title="Print shipping label"
              hint="Download a PDF ready to stick on the parcel."
              icon={Printer}
              tone="primary"
              busy={busy === "label-pdf"}
              disabled={Boolean(busy) && busy !== "label-pdf"}
              onClick={() => void run("shipping-label", { pdf: true, pdfSize: labelSize }, "label-pdf")}
            />
            <FulfilmentAction
              title="View label details"
              hint="Pull address and parcel fields without a PDF."
              icon={FileText}
              busy={busy === "label-data"}
              disabled={Boolean(busy) && busy !== "label-data"}
              onClick={() => void run("shipping-label", { pdf: false, pdfSize: labelSize }, "label-data")}
            />
          </div>
          {label?.kind === "link" ? (
            <p className="mt-4 text-sm">
              <a className="underline underline-offset-2 hover:text-ink" href={label.downloadUrl} target="_blank" rel="noreferrer">
                Open shipping label
              </a>
              {label.expiresInSeconds ? (
                <span className="text-mute"> · link expires in {Math.round(label.expiresInSeconds / 3600)} hours</span>
              ) : null}
            </p>
          ) : null}
          {label?.kind === "pdf" && label.pdfBase64 ? (
            <div className="mt-4 max-w-sm">
              <FulfilmentAction
                title="Open PDF"
                hint="Opens the label PDF in a new tab."
                icon={Printer}
                onClick={() => openPdf(label.pdfBase64)}
              />
            </div>
          ) : null}
          {label?.kind === "data" && label.fields.length ? (
            <dl className="mt-4 space-y-2 rounded-xl border border-line bg-[#ffffff] px-4 py-3 text-sm">
              {label.fields.map((field) => (
                <div key={field.key} className="flex flex-wrap gap-2 sm:flex-nowrap sm:gap-3">
                  <dt className="w-36 shrink-0 text-mute">{field.key}</dt>
                  <dd className="min-w-0 break-all">{field.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-6 px-5 py-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-mute">Shipping</p>
          <p className="mt-1 text-sm text-mute">Keep Delhivery in sync and move the parcel toward pickup.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FulfilmentAction
              title="Refresh tracking"
              hint="Pull the latest scan events from the carrier."
              icon={RefreshCw}
              busy={busy === "refresh"}
              disabled={Boolean(busy) && busy !== "refresh"}
              onClick={() => void run("refresh")}
            />
            <FulfilmentAction
              title="Book again"
              hint="Create a new Delhivery booking if none exists for this order."
              icon={RotateCcw}
              busy={busy === "retry-booking"}
              disabled={Boolean(busy) && busy !== "retry-booking"}
              onClick={() =>
                void run("retry-booking", {
                  acknowledgeAbsent: window.confirm("Confirm Delhivery has no shipment for this order before booking again."),
                })
              }
            />
            <FulfilmentAction
              title="Schedule pickup"
              hint="Ask Delhivery to collect this parcel from your location."
              icon={PackageCheck}
              busy={busy === "pickup"}
              disabled={Boolean(busy) && busy !== "pickup"}
              onClick={() => void run("pickup")}
            />
            <FulfilmentAction
              title="Cancel shipment"
              hint="Stop this waybill. Cannot be undone after the carrier confirms."
              icon={Trash2}
              tone="danger"
              busy={busy === "cancel-shipment"}
              disabled={Boolean(busy) && busy !== "cancel-shipment"}
              onClick={() => void run("cancel-shipment", { confirm: window.confirm("Cancel this shipment?") })}
            />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-mute">Exceptions</p>
          <p className="mt-1 text-sm text-mute">Use when the carrier flow does not apply.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FulfilmentAction
              title="Mark fulfilled manually"
              hint="Ship outside Delhivery and keep this order moving."
              icon={Hand}
              busy={busy === "manual"}
              disabled={Boolean(busy) && busy !== "manual"}
              onClick={() => void run("manual")}
            />
            <FulfilmentAction
              title="Start a refund"
              hint="Begin refund handling for payment on this order."
              icon={Banknote}
              busy={busy === "refund"}
              disabled={Boolean(busy) && busy !== "refund"}
              onClick={() => void run("refund")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
