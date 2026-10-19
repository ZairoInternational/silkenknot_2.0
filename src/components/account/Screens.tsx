"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, CircleHelp, Heart, MapPin, MessageCircle, Package, Pencil, Plus, RefreshCw, Search, Trash2, Truck, User } from "lucide-react";
import { INDIAN_STATES } from "@/app/checkout/shipping/page";
import { formatDate, formatPrice } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Address, Order } from "@/lib/types";
import { LogoutConfirm } from "@/components/account/LogoutConfirm";
import { OtpAuth } from "@/components/account/OtpAuth";
import { AccountDrawer } from "@/components/layout/AccountDrawer";
import { Field, Media } from "@/components/ui";
import { afterAuthPath, needsName, profileCompletion, safeNext } from "@/lib/auth/browser";
import { waybillListLabel } from "@/lib/shipping/states";

const shell = "page-pad mx-auto w-full max-w-lg px-5 pb-24 md:max-w-xl md:px-8";

export function LoginScreen() {
  const store = useStore();
  const router = useRouter();
  const [next, setNext] = useState("/shop");
  const openedAs = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("next");
    setNext(safeNext(requested || "/shop"));
  }, []);

  useEffect(() => {
    if (!store.ready || openedAs.current !== undefined) return;
    openedAs.current = store.currentUser?.id ?? null;
    if (openedAs.current && store.currentUser?.role !== "admin") router.replace(next);
  }, [store.ready, store.currentUser, router, next]);

  function leave() {
    const stay = next.startsWith("/checkout") || next.startsWith("/account") ? "/shop" : next;
    router.replace(stay);
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-paper">
      <AccountDrawer open next={next} onClose={leave} />
    </div>
  );
}

function Guard({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (store.ready && !store.currentUser) {
      router.replace(`/account/login?next=${encodeURIComponent(pathname || "/account")}`);
    }
  }, [store.ready, store.currentUser, router, pathname]);
  if (!store.currentUser) return <div className="page-pad px-5 text-mute">Opening your account…</div>;
  return <>{children}</>;
}

export function ProfileScreen() {
  return (
    <Guard>
      <ProfileForm />
    </Guard>
  );
}

function NameStep() {
  const store = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className={shell}>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8a7350]">One step left</p>
      <h1 className="mt-3 text-4xl font-medium tracking-tight">What should we call you?</h1>
      <p className="mt-3 text-sm leading-7 text-mute">Your name is required. It appears on orders and deliveries.</p>
      <form
        className="mt-8"
        onSubmit={async (event) => {
          event.preventDefault();
          const trimmed = name.trim().replace(/\s+/g, " ");
          if (trimmed.length < 2) {
            setError("Enter your name to continue.");
            return;
          }
          setBusy(true);
          setError("");
          const result = await store.updateProfile({ name: trimmed });
          setBusy(false);
          if (!result.ok) {
            setError(result.message);
            return;
          }
          router.replace(afterAuthPath(new URLSearchParams(window.location.search).get("next")));
        }}
      >
        <label className="search-field mt-2 flex h-12 items-center rounded-full border border-black/15 bg-white px-4 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]">
          <span className="sr-only">Name</span>
          <input
            name="name"
            autoFocus
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            value={name}
            placeholder="Your name"
            onChange={(event) => { setName(event.target.value); setError(""); }}
            className="h-full w-full bg-transparent text-base text-ink outline-none placeholder:text-[#8a8178] focus:outline-none focus-visible:outline-none"
          />
        </label>
        {error ? <p role="alert" className="mt-3 text-sm text-[#8d3b32]">{error}</p> : null}
        <button type="submit" disabled={busy} className="mt-5 h-12 w-full rounded-2xl bg-[#CBAC7C] text-[11px] font-medium uppercase tracking-[0.16em] text-white hover:bg-[#B39668] disabled:opacity-60">
          {busy ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}

function displayPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2)}`;
  if (digits.length === 10) return `+91 ${digits}`;
  return phone;
}

function AccountNav({ items, className }: { items: { href: string; label: string; icon: typeof User; active: boolean }[]; className: string }) {
  return (
    <nav className={className} aria-label="Account">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${item.active ? "bg-[#f6efe4] font-medium text-[#b08958]" : "border border-[#efe6d8] bg-white text-[#6f675d] md:border-0 md:bg-transparent md:py-2.5"}`}>
            <Icon size={16} strokeWidth={1.7} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const store = useStore();
  const user = store.currentUser!;
  const [confirmLogout, setConfirmLogout] = useState(false);
  const items = [
    { href: "/account", label: "Profile", icon: User, active: pathname === "/account" },
    { href: "/account/addresses", label: "Addresses", icon: MapPin, active: pathname.startsWith("/account/addresses") },
    { href: "/account/orders", label: "Orders", icon: Package, active: pathname.startsWith("/account/orders") },
    { href: "/wishlist", label: "Wishlist", icon: Heart, active: pathname.startsWith("/wishlist") },
  ];

  return (
    <div className="page-pad mx-auto w-full max-w-6xl px-4 pb-16 pt-6 md:px-8">
      <div className="md:grid md:grid-cols-[230px_minmax(0,1fr)] md:overflow-hidden md:rounded-[28px] md:border md:border-[#efe6d8] md:bg-white">
        <aside className="hidden border-[#efe6d8] px-5 py-8 md:block md:border-r max-md:hidden">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#f6f1e8] text-[#c4a574]">
              <User size={22} strokeWidth={1.6} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[#2c2926]">{user.name || "Your account"}</span>
              <span className="mt-0.5 block truncate text-xs text-[#8a8178]">{user.phone ? displayPhone(user.phone) : user.email}</span>
            </span>
          </div>
          <AccountNav items={items} className="mt-8 space-y-1" />
        </aside>
        <div className="min-w-0 md:px-8 md:py-8">{children}</div>
      </div>
      <LogoutConfirm
        open={confirmLogout}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          void store.logout();
        }}
      />
    </div>
  );
}

function ProfileForm() {
  const store = useStore();
  const user = store.currentUser!;
  const [name, setName] = useState(user.name);
  const [editingName, setEditingName] = useState(false);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState("");
  const [linking, setLinking] = useState<"link-email" | "link-phone" | null>(null);

  if (needsName(user)) return <NameStep />;

  return (
    <AccountFrame>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#c4a574]">My profile</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight text-[#2c2926]">Personal Information</h1>
      <p className="mt-2 text-sm text-[#8a8178]">Manage your personal details and contact information.</p>
      <ProfileCompletion
        user={user}
        onPhone={() => setLinking("link-phone")}
        onEmail={() => setLinking("link-email")}
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-[24px] border border-[#efe6d8] bg-white p-4 md:bg-[#fffcf8]">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#efe6d8] bg-white px-4 py-3">
            {editingName ? (
              <form
                className="flex w-full items-center gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const result = await store.updateProfile({ name });
                  setNote(result.ok ? "Name saved." : result.message);
                  if (result.ok) setEditingName(false);
                }}
              >
                <label className="min-w-0 flex-1">
                  <span className="text-xs text-[#b7a48a]">Full Name</span>
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-0.5 h-8 w-full bg-transparent text-sm font-medium text-[#2c2926] outline-none"
                  />
                </label>
                <button type="submit" className="h-8 rounded-full bg-[#c6a15e] px-3 text-xs text-white">Save</button>
              </form>
            ) : (
              <>
                <div>
                  <p className="text-xs text-[#b7a48a]">Full Name</p>
                  <p className="mt-0.5 text-sm font-medium text-[#2c2926]">{user.name}</p>
                </div>
                <button type="button" aria-label="Edit full name" className="text-[#c4a574]" onClick={() => { setName(user.name); setEditingName(true); }}>
                  <Pencil size={16} />
                </button>
              </>
            )}
          </div>
          <InfoRow label="Phone Number" value={user.phone ? displayPhone(user.phone) : "Not added"} onEdit={() => setLinking("link-phone")} />
          <InfoRow label="Email Address" value={user.email || "Not added"} onEdit={() => setLinking("link-email")} />
          {linking ? (
            <div className="rounded-2xl border border-[#efe6d8] bg-[#fffcf8] p-3">
              <OtpAuth variant="inline" purpose={linking} onDone={() => setLinking(null)} />
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-[#efe6d8] bg-white px-6 py-10 text-center md:bg-[#fffcf8]">
          {photo ? (
            <span className="relative size-20 overflow-hidden rounded-full">
              <Media src={photo} alt="" sizes="80px" className="object-cover" />
            </span>
          ) : (
            <span className="grid size-20 place-items-center rounded-full bg-[#f6f1e8] text-[#c4a574]">
              <User size={32} strokeWidth={1.5} />
            </span>
          )}
          <p className="mt-4 text-base font-medium text-[#2c2926]">Profile Picture</p>
          <p className="mt-1 max-w-xs text-sm text-[#8a8178]">Add a profile picture to make your account more personal.</p>
          <label className="mt-5 inline-flex h-10 cursor-pointer items-center rounded-full bg-[#f3e6cf] px-5 text-sm font-medium text-[#8a7350]">
            Change Photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setPhoto(URL.createObjectURL(file));
              }}
            />
          </label>
        </div>
      </div>
      {note ? <p role="status" className="mt-4 text-sm text-[#8a8178]">{note}</p> : null}
    </AccountFrame>
  );
}

function ProfileCompletion({
  user,
  onPhone,
  onEmail,
}: {
  user: NonNullable<ReturnType<typeof useStore>["currentUser"]>;
  onPhone: () => void;
  onEmail: () => void;
}) {
  const completion = profileCompletion(user);
  const hints: Record<string, string> = {
    name: "Add the name that should appear on your orders.",
    phone: "Add a verified phone number for delivery updates.",
    email: "Add a verified email for receipts and sign-in.",
    address: "Add a delivery address so checkout is faster.",
  };
  const next = completion.next;

  return (
    <section className="mt-6 rounded-[24px] border border-[#efe6d8] bg-white p-4 md:bg-[#fffcf8]" aria-label="Profile completion">
      <div className="flex items-center gap-4">
        <ProgressRing percent={completion.percent} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#2c2926]">
            {completion.percent === 100 ? "Your profile is complete" : `Your profile is ${completion.percent}% complete`}
          </p>
          <p className="mt-1 text-sm text-[#8a8178]">
            {next ? hints[next.id] : "Name, phone, email, and a delivery address are saved."}
          </p>
          {next?.id === "phone" ? (
            <button type="button" className="mt-3 h-9 rounded-full bg-[#c6a15e] px-4 text-sm text-white" onClick={onPhone}>Add phone</button>
          ) : null}
          {next?.id === "email" ? (
            <button type="button" className="mt-3 h-9 rounded-full bg-[#c6a15e] px-4 text-sm text-white" onClick={onEmail}>Add email</button>
          ) : null}
          {next?.id === "address" ? (
            <Link href="/account/addresses" className="mt-3 inline-flex h-9 items-center rounded-full bg-[#c6a15e] px-4 text-sm text-white">Add address</Link>
          ) : null}
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2">
        {completion.steps.map((step) => (
          <li key={step.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${step.done ? "bg-[#e7f6ec] text-[#1f8a4c]" : "bg-[#f6f1e8] text-[#8a7350]"}`}>
            <span className={`grid size-5 place-items-center rounded-full ${step.done ? "bg-[#1f8a4c] text-white" : "border border-[#e3d3b8] bg-white"}`}>
              {step.done ? <Check size={12} strokeWidth={2.4} /> : null}
            </span>
            {step.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  return (
    <span className="relative grid size-16 shrink-0 place-items-center">
      <svg viewBox="0 0 72 72" className="size-16 -rotate-90" aria-hidden>
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#efe6d8" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="#c6a15e"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-xs font-semibold text-[#2c2926]">{percent}%</span>
    </span>
  );
}

function InfoRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#efe6d8] bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-[#b7a48a]">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-[#2c2926]">{value}</p>
      </div>
      <button type="button" aria-label={`Edit ${label}`} className="text-[#c4a574]" onClick={onEdit}>
        <Pencil size={16} />
      </button>
    </div>
  );
}

export function OrdersScreen() {
  return (
    <Guard>
      <AccountFrame>
        <OrderList />
      </AccountFrame>
    </Guard>
  );
}

export function orderStatus(order: Order) {
  const cancelled = order.status === "cancelled" || order.orderState === "cancelled" || order.shipment?.state === "cancelled" || order.paymentState === "cancelled";
  if (cancelled && (order.paymentState === "refund_pending" || order.paymentState === "partially_refunded")) return "Refund in progress";
  if (cancelled && order.paymentState === "refunded") return "Refunded";
  if (cancelled) return "Cancelled";
  if (order.paymentState === "refund_pending" || order.paymentState === "partially_refunded") return "Refund in progress";
  if (order.paymentState === "refunded") return "Refunded";
  if (order.shipment?.awb) return waybillListLabel(order.shipment.state);
  if (order.payment === "cod" && order.orderState === "confirmed" && order.paymentState === "pending") return "Confirmed · cash on delivery";
  if (order.shipment?.state === "exception" || order.shipment?.state === "unknown") return "Shipment needs attention";
  if (order.shipment?.state === "out_for_delivery") return "Out for delivery";
  if (order.shipment?.state === "in_transit" || order.shipment?.state === "picked_up") return "In transit";
  if (order.fulfillmentState === "delivered" || order.status === "delivered" || order.orderState === "completed") return "Delivered";
  if (order.fulfillmentState === "shipped" || order.status === "shipped") return "Shipped";
  if (order.fulfillmentState === "packed" || order.status === "packed") return "Packed";
  if (order.status === "cancelled" || order.orderState === "cancelled" || order.paymentState === "cancelled" || order.paymentState === "failed") return "Cancelled";
  if (order.status === "pending_payment" || order.paymentState === "pending" || order.paymentState === "authorized") return "Payment pending";
  return "Confirmed";
}

export function orderAgain(order: Order, store: ReturnType<typeof useStore>) {
  let added = 0;
  for (const item of order.items) {
    const result = store.addToCart(item.productId, item.variantLabel, item.quantity);
    if (result.ok) added += 1;
  }
  if (added) {
    store.openCart();
    store.notify(added === order.items.length ? "Added to bag" : "Some pieces were added to your bag");
    return;
  }
  store.notify("These pieces are unavailable.");
}

function orderGroup(order: Order) {
  if (
    order.status === "cancelled" ||
    order.orderState === "cancelled" ||
    order.paymentState === "cancelled" ||
    order.paymentState === "refunded" ||
    order.shipment?.state === "cancelled"
  ) return "cancelled";
  const status = orderStatus(order);
  if (status === "Delivered") return "delivered";
  if (status === "Cancelled" || status === "Refunded" || status === "Refund in progress") return "cancelled";
  return "progress";
}

function shortStatus(status: string) {
  if (status.startsWith("Confirmed")) return "Confirmed";
  if (status === "In transit" || status === "Out for delivery") return "On the way";
  if (status === "Packed") return "Preparing";
  return status;
}

function payLabel(order: Order) {
  if (order.payment === "cod") return "Pay on delivery";
  if (order.payment === "upi") return "Paid via UPI";
  if (order.payment === "card") return "Paid via card";
  return "Paid online";
}

function orderStory(order: Order, status: string) {
  const when = formatDate(order.createdAt);
  const estimate = order.shipment?.estimate?.replace(/^Test · /, "");
  if (status === "Delivered") return { title: `Delivered on ${when}`, body: "Your order has been delivered." };
  if (order.status === "cancelled" || order.orderState === "cancelled" || order.shipment?.state === "cancelled" || status === "Cancelled" || status === "Refunded") {
    return {
      title: "This order was cancelled",
      body: status === "Refund in progress" ? "Your refund is in progress." : "It is no longer on the way.",
    };
  }
  if (status === "Shipped" || status === "In transit" || status === "Out for delivery") return { title: "On the way", body: estimate ? `Expected ${estimate}` : "Delivery updates show on the order." };
  if (status === "Payment pending") return { title: "Payment is not confirmed yet", body: "This order stays here until payment is confirmed." };
  return { title: "Preparing your order", body: estimate ? `Expected ${estimate}` : "We are getting it ready." };
}

function OrderList() {
  const store = useStore();
  const router = useRouter();
  const user = store.currentUser!;
  const orders = store.orders.filter((order) => order.userId === user.id || order.email === user.email);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "progress" | "delivered" | "cancelled">("all");

  useEffect(() => {
    if (needsName(user)) router.replace("/account?next=/account/orders");
  }, [user, router]);

  if (needsName(user)) return null;

  const needle = query.trim().toLowerCase();
  const visible = orders.filter((order) => {
    if (filter !== "all" && orderGroup(order) !== filter) return false;
    if (!needle) return true;
    const haystack = [order.number, order.id, ...order.items.map((item) => item.name)].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
  const filters = [
    ["all", "All"],
    ["progress", "In progress"],
    ["delivered", "Delivered"],
    ["cancelled", "Cancelled"],
  ] as const;

  return (
    <div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-8">
        <div>
          <h1 className="text-[1.75rem] font-medium tracking-tight text-[#2c2926] md:text-3xl">Your orders</h1>
          <p className="mt-2 max-w-xl text-sm text-[#6f675d]">Track your orders, view details, and reorder your favorite products.</p>
          <label className="mt-5 flex h-11 items-center gap-2 rounded-xl border border-[#e3dbd1] bg-white px-3 text-sm text-[#6f675d]">
            <Search size={16} className="shrink-0 text-[#8a7350]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by order number…" className="min-w-0 flex-1 bg-transparent text-[#2c2926] outline-none placeholder:text-[#9a948b]" />
          </label>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
              {filters.map(([id, label]) => (
                <button key={id} type="button" onClick={() => setFilter(id)} className={`h-9 shrink-0 rounded-full px-3 text-xs ${filter === id ? "bg-[#2c2926] text-white" : "border border-[#e3dbd1] bg-white text-[#4e4943]"}`}>
                  {label}
                </button>
              ))}
            </div>
            <span className="shrink-0 text-xs text-[#6f675d]">{visible.length} {visible.length === 1 ? "order" : "orders"}</span>
          </div>
          {orders.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[#e3dbd1] bg-white px-6 py-12 text-center">
              <Package size={28} className="mx-auto text-[#CBAC7C]" />
              <p className="mt-4 text-[#2c2926]">No orders yet.</p>
              <Link href="/shop" className="mt-5 inline-flex h-11 items-center rounded-md bg-[#CBAC7C] px-5 text-[11px] uppercase tracking-[0.14em] text-white hover:bg-[#B39668]">Continue shopping</Link>
            </div>
          ) : visible.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-[#e3dbd1] bg-white px-5 py-8 text-sm text-[#6f675d]">{needle ? "No orders match this search." : filter === "cancelled" ? "No cancelled orders." : filter === "delivered" ? "No delivered orders." : "No orders in progress."}</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {visible.map((order) => <OrderCard key={order.id} order={order} />)}
            </ul>
          )}
        </div>
        <OrderHelp />
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const store = useStore();
  const status = orderStatus(order);
  const story = orderStory(order, status);
  const group = orderGroup(order);
  const shown = order.items.slice(0, 3);
  const extra = order.items.length - shown.length;
  const again = group === "delivered" || group === "cancelled";
  return (
    <li className="rounded-2xl border border-[#e3dbd1] bg-white p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#2c2926]">Order #{order.number}</p>
          <p className="mt-1 text-xs text-[#6f675d]">{formatDate(order.createdAt)}</p>
          <div className="mt-3 flex items-center justify-between gap-3 lg:hidden">
            <span className="text-xs text-[#6f675d]">{payLabel(order)}</span>
            <span className="text-sm font-medium text-[#2c2926]">{formatPrice(order.total)}</span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${statusTone(status)}`}>{shortStatus(status)}</span>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto">
            {shown.map((item) => (
              <span key={`${item.productId}-${item.variantLabel}`} className="w-16 shrink-0 md:w-[4.5rem]">
                <span className="relative grid size-16 place-items-center overflow-hidden rounded-lg bg-[#f6f3ee] md:size-[4.5rem]">
                  {item.image ? <Media src={item.image} alt="" sizes="72px" className="object-cover" /> : <Package size={16} className="text-[#CBAC7C]" />}
                </span>
                <span className="mt-1 block truncate text-[11px] text-[#4e4943]">{item.name}</span>
              </span>
            ))}
            {extra > 0 ? <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-[#f6f3ee] text-xs text-[#6f675d] md:size-[4.5rem]">+{extra}</span> : null}
          </div>
        </div>
        <div className="lg:w-64 lg:text-right">
          <div className="hidden items-center justify-end gap-3 lg:flex">
            <span className="text-xs text-[#6f675d]">{payLabel(order)}</span>
            <span className="text-sm font-medium text-[#2c2926]">{formatPrice(order.total)}</span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${statusTone(status)}`}>{shortStatus(status)}</span>
          </div>
          <p className="text-sm font-medium text-[#2c2926] lg:mt-4">{story.title}</p>
          <p className="mt-1 text-xs leading-5 text-[#6f675d]">{story.body}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row lg:justify-end">
            {group === "progress" ? (
              <Link href={`/orders/${order.id}#tracking`} className="inline-flex h-10 items-center justify-center rounded-md bg-[#CBAC7C] px-4 text-xs text-white hover:bg-[#B39668]">Track order</Link>
            ) : null}
            {again ? (
              <button type="button" onClick={() => orderAgain(order, store)} className="inline-flex h-10 items-center justify-center rounded-md bg-[#CBAC7C] px-4 text-xs text-white hover:bg-[#B39668]">Buy again</button>
            ) : null}
            <Link href={`/orders/${order.id}#details`} className="inline-flex h-10 items-center justify-center rounded-md border border-[#e3dbd1] px-4 text-xs text-[#2c2926]">View details</Link>
          </div>
        </div>
      </div>
    </li>
  );
}

function OrderHelp() {
  const links = [
    { href: "/shipping", label: "Shipping information", icon: <Truck size={16} /> },
    { href: "/returns", label: "Returns and exchanges", icon: <RefreshCw size={16} /> },
    { href: "/faq", label: "Track an order", icon: <MapPin size={16} /> },
    { href: "/faq", label: "FAQs", icon: <CircleHelp size={16} /> },
  ];
  return (
    <aside className="mt-8 space-y-4 lg:sticky lg:top-24 lg:mt-0">
      <div className="rounded-2xl border border-[#e3dbd1] bg-[#fbf9f6] p-4">
        <p className="text-sm font-medium text-[#2c2926]">Need help?</p>
        <p className="mt-1 text-xs leading-5 text-[#6f675d]">Support for your orders, shipping, and returns.</p>
        <ul className="mt-3 space-y-1">
          {links.map((link) => (
            <li key={link.label}>
              <Link href={link.href} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[#2c2926] hover:bg-white">
                <span className="text-[#8a7350]">{link.icon}</span>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-[#e3dbd1] bg-white p-4">
        <p className="text-sm font-medium text-[#2c2926]">Questions?</p>
        <p className="mt-1 text-xs text-[#6f675d]">Our team is happy to help.</p>
        <Link href="/contact" className="mt-3 inline-flex h-10 items-center gap-2 rounded-md border border-[#e3dbd1] px-3 text-xs text-[#2c2926]">
          <MessageCircle size={14} className="text-[#8a7350]" /> Contact us
        </Link>
      </div>
    </aside>
  );
}

function statusTone(status: string) {
  if (status === "Delivered") return "bg-[#e7f0e4] text-[#3d5c3a]";
  if (status === "Cancelled" || status === "Refunded") return "bg-[#f6ece8] text-[#8a4b3c]";
  if (status === "Payment pending" || status === "Refund in progress") return "bg-[#f6f3ee] text-[#6f675d]";
  return "bg-[#f3ead8] text-[#8a7350]";
}

export function AddressesScreen() {
  return (
    <Guard>
      <AddressBook />
    </Guard>
  );
}

function emptyAddress(name: string): Address {
  return {
    id: `addr-${Date.now()}`,
    label: "Home",
    name,
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal: "",
    country: "India",
    phone: "",
    isDefault: false,
  };
}

function AddressBook() {
  const store = useStore();
  const router = useRouter();
  const user = store.currentUser!;
  const [editing, setEditing] = useState<Address | null>(null);
  const [back, setBack] = useState("/account");
  const [picking, setPicking] = useState("");
  const fromShipping = back.startsWith("/checkout");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("next");
    setBack(safeNext(requested || "/account"));
  }, []);

  useEffect(() => {
    if (needsName(user)) router.replace("/account?next=/account/addresses");
  }, [user, router]);

  if (needsName(user)) return null;

  return (
    <AccountFrame>
      {fromShipping ? <Link href={back} className="text-sm text-[#b08958]">Back to shipping</Link> : null}
      <div className="mt-1 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#c4a574]">My addresses</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-[#2c2926]">Manage Addresses</h1>
          <p className="mt-2 text-sm text-[#8a8178]">Add and manage your shipping and billing addresses.</p>
        </div>
        <button type="button" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#c6a15e] px-5 text-sm font-medium text-white hover:bg-[#b3924f] md:w-auto" onClick={() => setEditing(emptyAddress(user.name))}>
          <Plus size={16} /> Add New Address
        </button>
      </div>
      {user.addresses.length === 0 && !editing ? (
        <div className="mt-8 rounded-[24px] border border-[#efe6d8] bg-white px-6 py-12 text-center">
          <MapPin size={28} className="mx-auto text-[#c4a574]" />
          <p className="mt-4 text-[#2c2926]">No saved address yet.</p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {user.addresses.map((address) => (
            <li key={address.id} className="rounded-[24px] border border-[#efe6d8] bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f6f1e8] text-[#c4a574]">
                  <MapPin size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-[#2c2926]">{address.name}</p>
                    {address.isDefault ? <span className="rounded-md bg-[#f6efe4] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#b08958]">Default</span> : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#a08a62]">{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
                  <p className="text-sm leading-6 text-[#a08a62]">{address.city}, {address.state} {address.postal}</p>
                  <p className="text-sm text-[#a08a62]">{address.phone ? displayPhone(address.phone) : ""}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {address.isDefault && fromShipping ? (
                  <button type="button" className="inline-flex h-9 items-center rounded-full bg-[#c6a15e] px-4 text-sm text-white" onClick={() => router.push(back)}>Use this address</button>
                ) : null}
                {!address.isDefault ? (
                  <button
                    type="button"
                    className="inline-flex h-9 items-center rounded-full border border-[#e7d7bc] px-4 text-sm text-[#b08958] disabled:opacity-50"
                    disabled={picking === address.id}
                    onClick={async () => {
                      setPicking(address.id);
                      await store.saveAddress({ ...address, isDefault: true });
                      if (fromShipping) router.push(back);
                      setPicking("");
                    }}
                  >
                    {fromShipping ? "Deliver here" : "Set as default"}
                  </button>
                ) : null}
                <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#e7d7bc] px-4 text-sm text-[#b08958]" onClick={() => setEditing(address)}>
                  <Pencil size={14} /> Edit
                </button>
                <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#f0d2cb] px-4 text-sm text-[#c45c4a]" onClick={() => void store.deleteAddress(address.id)}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <form
          className="mt-6 grid gap-4 rounded-[24px] border border-[#efe6d8] bg-white p-5 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            await store.saveAddress({ ...editing, country: "India" });
            setEditing(null);
          }}
        >
          <p className="text-sm font-medium text-[#2c2926] md:col-span-2">{editing.line1 ? "Edit address" : "New address"}</p>
          {([
            ["label", "Label"],
            ["name", "Name"],
            ["phone", "Phone"],
            ["line1", "Address"],
            ["line2", "Apartment"],
            ["city", "City"],
            ["postal", "PIN code"],
          ] as const).map(([key, label]) => (
            <Field
              key={key}
              label={label}
              name={key}
              required={key !== "line2"}
              value={editing[key]}
              onChange={(event) => setEditing({ ...editing, [key]: event.target.value })}
            />
          ))}
          <label className="block text-sm md:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.14em] text-mute">State</span>
            <select
              required
              value={editing.state}
              onChange={(event) => setEditing({ ...editing, state: event.target.value })}
              className="mt-2 h-12 w-full rounded-lg border border-[#e3dbd1] bg-white px-3 text-sm"
            >
              <option value="">Select state</option>
              {(editing.state && !INDIAN_STATES.includes(editing.state) ? [editing.state, ...INDIAN_STATES] : INDIAN_STATES).map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-[#2c2926] md:col-span-2">
            <input type="checkbox" checked={editing.isDefault} onChange={(event) => setEditing({ ...editing, isDefault: event.target.checked })} className="size-4 accent-[#CBAC7C]" />
            Default address
          </label>
          <div className="flex items-center gap-4 md:col-span-2">
            <button type="submit" className="h-11 rounded-full bg-[#c6a15e] px-6 text-sm font-medium text-white hover:bg-[#b3924f]">Save address</button>
            <button type="button" onClick={() => setEditing(null)} className="text-sm text-[#8a8178]">Cancel</button>
          </div>
        </form>
      ) : null}
    </AccountFrame>
  );
}
