"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  House,
  Info,
  Leaf,
  Mail,
  MapPin,
  Package,
  Phone,
  Truck,
} from "lucide-react";
import { orderStatus } from "@/components/account/Screens";
import { Media } from "@/components/ui";
import { csrfHeaders } from "@/lib/auth/browser";
import { ORDER_STORAGE_KEY, type CheckoutDraft } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { customerCanCancel, waybillProgress } from "@/lib/shipping/states";
import { useStore } from "@/lib/store";
import type { Order } from "@/lib/types";

/** Brand tokens mapped to the mock layout (cream paper + bronze accent). */
const CARD =
  "rounded-2xl border border-[#e3dbd1] bg-white p-5 shadow-[0_10px_40px_-24px_rgba(44,41,38,0.35)] md:p-6";
const ACCENT = "#9a7352";

function OrderDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
    >
      <Image
        src="/silknknot/decor/branch-left.svg"
        alt=""
        width={260}
        height={330}
        unoptimized
        className="absolute -left-10 top-16 hidden w-28 opacity-70 sm:block md:-left-4 md:top-10 md:w-40 lg:w-[200px]"
      />
      {/* Real branch sprig (not a UI mock screenshot) */}
      <Image
        src="/silknknot/decor/order-branch-sprig.jpg"
        alt=""
        width={720}
        height={960}
        unoptimized
        className="absolute -right-16 -top-6 hidden w-[min(40vw,300px)] mix-blend-multiply sm:block md:-right-6 md:top-0 lg:right-0 lg:w-[340px]"
      />
      <Image
        src="/silknknot/decor/branch-right.svg"
        alt=""
        width={340}
        height={380}
        unoptimized
        className="absolute -right-8 top-0 w-32 opacity-85 sm:hidden"
      />
      <Image
        src="/silknknot/decor/petal.svg"
        alt=""
        width={80}
        height={104}
        unoptimized
        className="absolute left-[4%] top-28 hidden w-8 rotate-[-12deg] opacity-80 sm:block lg:left-[2%] lg:w-10"
      />
      <Image
        src="/silknknot/decor/order-branch-jar.jpg"
        alt=""
        width={800}
        height={800}
        unoptimized
        className="absolute -bottom-10 -right-14 hidden w-[min(42vw,280px)] mix-blend-multiply opacity-90 md:block lg:-bottom-6 lg:right-0 lg:w-[300px]"
      />
    </div>
  );
}

const TRACK_STEPS = ["Confirmed", "Processing", "Shipped", "Out for delivery", "Delivered"] as const;
const PENDING_ICONS = [Check, Package, Truck, MapPin, House] as const;

function delhiveryTrackUrl(awb: string) {
  return `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`;
}

function courierLabel() {
  return "DELHIVERY";
}

function shortDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function placedOn(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function deliveryProgress(order: Order | null) {
  if (!order) return { index: 0, badge: "Confirmed", alert: false };
  if (
    order.status === "cancelled" ||
    order.orderState === "cancelled" ||
    order.paymentState === "cancelled" ||
    order.paymentState === "failed"
  ) {
    return { index: -1, badge: "Cancelled", alert: true };
  }
  const state = order.shipment?.state;
  if (order.shipment?.awb) return waybillProgress(state);
  if (
    order.fulfillmentState === "delivered" ||
    order.status === "delivered" ||
    state === "delivered" ||
    order.orderState === "completed"
  ) {
    return { index: 4, badge: "Delivered", alert: false };
  }
  if (state === "out_for_delivery" || state === "delivery_failed") {
    return {
      index: 3,
      badge: state === "delivery_failed" ? "Delivery attempted" : "Out for delivery",
      alert: state === "delivery_failed",
    };
  }
  if (
    order.fulfillmentState === "shipped" ||
    order.status === "shipped" ||
    state === "picked_up" ||
    state === "in_transit"
  ) {
    return { index: 2, badge: "Shipped", alert: false };
  }
  if (
    order.fulfillmentState === "packed" ||
    order.status === "packed" ||
    state === "booked" ||
    state === "pickup_scheduled"
  ) {
    return { index: 1, badge: "Processing", alert: false };
  }
  return { index: 0, badge: "Confirmed", alert: false };
}

function stepDates(order: Order | null, createdAt: string, index: number) {
  const events = order?.shipment?.events || [];
  const when = (states: string[]) => events.find((event) => states.includes(event.state))?.at;
  const dates = [
    createdAt,
    when(["booked", "pickup_scheduled", "pending"]),
    when(["picked_up", "in_transit"]),
    when(["out_for_delivery", "delivery_failed"]),
    when(["delivered"]),
  ];
  return dates.map((value, step) =>
    step <= index ? shortDate(value || (step === 0 ? createdAt : undefined)) : "—",
  );
}

function OrderDetailsSkeleton() {
  return (
    <div className="mt-5" aria-busy="true" aria-label="Loading order details">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-9 w-52 animate-pulse rounded bg-[#e6e0d6]" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-[#eee8de]" />
        </div>
        <div className="h-7 w-24 shrink-0 animate-pulse rounded-full bg-[#eee8de]" />
      </div>
      <section className="mt-6 rounded-2xl border border-[#e3dbd1] bg-white p-5 md:p-6">
        <div className="h-6 w-28 animate-pulse rounded bg-[#e6e0d6]" />
        <div className="relative mt-8">
          <span className="absolute left-[10%] right-[10%] top-[18px] h-0.5 bg-[#e6e0d6]" />
          <ol className="relative grid grid-cols-5 gap-1">
            {Array.from({ length: 5 }, (_, step) => (
              <li className="flex flex-col items-center gap-2" key={step}>
                <span className="size-9 animate-pulse rounded-full bg-[#e6e0d6]" />
                <span className="h-3 w-14 animate-pulse rounded bg-[#eee8de]" />
                <span className="h-3 w-16 animate-pulse rounded bg-[#eee8de]" />
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-8 grid gap-4 border-t border-[#e3dbd1] pt-5 md:grid-cols-3">
          <div className="h-12 animate-pulse rounded bg-[#eee8de]" />
          <div className="h-12 animate-pulse rounded bg-[#eee8de]" />
          <div className="h-12 animate-pulse rounded bg-[#e6e0d6]" />
        </div>
      </section>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.85fr)]">
        <section className="rounded-2xl border border-[#e3dbd1] bg-white p-5">
          <div className="h-6 w-40 animate-pulse rounded bg-[#e6e0d6]" />
          {Array.from({ length: 3 }, (_, row) => (
            <div className="flex items-start gap-3 border-b border-[#efede6] py-4 last:border-0" key={row}>
              <span className="size-16 shrink-0 animate-pulse rounded-xl bg-[#eee8de]" />
              <span className="min-w-0 flex-1 space-y-2">
                <span className="block h-4 w-3/4 animate-pulse rounded bg-[#e6e0d6]" />
                <span className="block h-3 w-1/2 animate-pulse rounded bg-[#eee8de]" />
              </span>
              <span className="h-4 w-14 shrink-0 animate-pulse rounded bg-[#eee8de]" />
            </div>
          ))}
        </section>
        <aside className="h-fit rounded-2xl border border-[#e3dbd1] bg-white p-5">
          <div className="h-6 w-40 animate-pulse rounded bg-[#e6e0d6]" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-[#eee8de]" />
            <div className="h-4 w-full animate-pulse rounded bg-[#eee8de]" />
            <div className="h-6 w-full animate-pulse rounded bg-[#e6e0d6]" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function CopyAwb({ awb }: { awb: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 text-[#8a7350] transition-colors hover:text-[#6f5a3e]"
      aria-label={copied ? "Copied" : "Copy tracking number"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(awb);
        } catch {
          /* clipboard may be blocked */
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
      <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function OrderDetails({ id }: { id: string }) {
  const [order, setOrder] = useState<CheckoutDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<"missing" | "failed" | null>(null);
  const [status, setStatus] = useState("Order received");
  const store = useStore();
  const [serverOrder, setServerOrder] = useState<Order | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setOrder(null);
    setServerOrder(null);
    try {
      const raw = sessionStorage.getItem(ORDER_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as CheckoutDraft;
        if (saved.id === id || saved.number === id) {
          setOrder(saved);
          setStatus(saved.status === "Paid" ? "Order confirmed" : "Order received");
        }
      }
    } catch {
      setOrder(null);
    }
    fetch(`/api/checkout/order?id=${encodeURIComponent(id)}`, { headers: csrfHeaders(false) })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 401 || response.status === 404) {
          setLoadError("missing");
          return;
        }
        if (!response.ok) {
          setLoadError("failed");
          return;
        }
        const body = (await response.json()) as { order?: Order };
        const loaded = body?.order || null;
        if (!loaded) {
          setLoadError("missing");
          return;
        }
        setLoadError(null);
        setStatus(orderStatus(loaded));
        setServerOrder(loaded);
        setOrder({
          id: loaded.id,
          number: loaded.number,
          items: loaded.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            variant: item.variantLabel,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
          subtotal: loaded.subtotal,
          discount: loaded.discount,
          shipping: loaded.shipping,
          total: loaded.total,
          address: {
            fullName: loaded.customerName,
            email: loaded.email,
            phone: loaded.phone,
            address1: loaded.address.line1,
            address2: loaded.address.line2,
            city: loaded.address.city,
            postalCode: loaded.address.postal,
            country: loaded.address.country,
          },
          paymentMethod: loaded.payment === "card" ? "card" : "razorpay",
          paymentId: loaded.paymentId,
          couponCode: loaded.couponCode,
          status:
            loaded.paymentState === "captured" || loaded.status === "confirmed" ? "Paid" : "Pending",
          createdAt: loaded.createdAt,
          userId: loaded.userId || "",
          deliveryEstimate: loaded.shipment?.estimate,
        });
        if (loaded.shipment?.awb) {
          fetch("/api/checkout/tracking", {
            method: "POST",
            headers: csrfHeaders(),
            body: JSON.stringify({ orderId: loaded.id }),
          })
            .then(async (trackResponse) => {
              if (!trackResponse.ok || cancelled) return;
              const trackBody = (await trackResponse.json()) as { order?: Order };
              if (cancelled || !trackBody.order) return;
              setServerOrder(trackBody.order);
              setStatus(orderStatus(trackBody.order));
            })
            .catch(() => {
              /* keep last known shipment status */
            });
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const progress = deliveryProgress(serverOrder);
  const dates = stepDates(serverOrder, order?.createdAt || "", progress.index);
  const trackStatus = serverOrder ? orderStatus(serverOrder) : progress.badge;
  const awb = serverOrder?.shipment?.awb;
  const paidOnline =
    Boolean(serverOrder) &&
    serverOrder?.payment !== "cod" &&
    order?.status !== "Pending" &&
    serverOrder?.paymentState !== "failed" &&
    serverOrder?.paymentState !== "cancelled";

  const showDelhiveryTrack = Boolean(awb) && serverOrder?.shipment?.provider !== "manual";

  return (
    <main className="relative isolate overflow-hidden bg-[var(--paper)]">
      <OrderDecor />
      <div className="page-pad relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 sm:px-5 lg:px-8">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-sm text-[#8a7350] transition-colors hover:text-[#6f5a3e]"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> Back to orders
        </Link>

        {loading && !order ? (
          <OrderDetailsSkeleton />
        ) : !order ? (
          <section className={`mt-6 ${CARD}`}>
            <h1 className="font-serif text-[1.75rem] font-medium tracking-tight text-[#2c2926]">
              Order details
            </h1>
            <p className="mt-2 break-all text-sm text-[#6f675d]">Order {id}</p>
            {loadError === "failed" ? (
              <>
                <h2 className="mt-6 text-lg font-medium text-[#2c2926]">
                  Couldn&apos;t load this order
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#6f675d]">
                  Something went wrong while fetching the details. Refresh the
                  page and try again.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-6 text-lg font-medium text-[#2c2926]">
                  Order not available on this device
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#6f675d]">
                  This order is not on your account. Sign in with the same
                  customer who paid, then open Account.
                </p>
              </>
            )}
          </section>
        ) : (
          <>
            <div className="mt-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-serif text-[1.85rem] font-medium tracking-tight text-[#2c2926] md:text-[2.25rem]">
                  Order details
                </h1>
                <p className="mt-2 text-sm text-[#6f675d]">
                  Order #{order.number || id}
                  {placedOn(order.createdAt)
                    ? ` · Placed on ${placedOn(order.createdAt)}`
                    : ""}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium ${
                  progress.alert
                    ? "bg-[#f6ece8] text-[#8a4b3c]"
                    : "bg-[#f3ead8] text-[#8a7350]"
                }`}
              >
                {!progress.alert ? (
                  <Check size={13} strokeWidth={2.25} aria-hidden />
                ) : null}
                {trackStatus}
              </span>
            </div>

            <section id="tracking" className={`mt-6 scroll-mt-28 ${CARD}`}>
              <h2 className="font-serif text-xl font-medium text-[#2c2926]">
                Track order
              </h2>

              <div className="relative mt-8 md:mt-9">
                <span className="absolute left-[10%] right-[10%] top-[17px] h-[2px] bg-[#e6e0d6] md:top-[19px]" />
                {progress.index > 0 ? (
                  <span
                    className="absolute left-[10%] top-[17px] h-[2px] md:top-[19px]"
                    style={{
                      width: `${(80 / 4) * Math.min(progress.index, 4)}%`,
                      backgroundColor: ACCENT,
                    }}
                  />
                ) : null}
                <ol
                  className="relative grid grid-cols-5 gap-0.5 sm:gap-1"
                  aria-label="Delivery progress"
                >
                  {TRACK_STEPS.map((label, step) => {
                    const reached =
                      progress.index >= 0 && step <= progress.index;
                    const PendingIcon = PENDING_ICONS[step];
                    const showHouse = step === 4 && reached;
                    return (
                      <li
                        className="relative z-[1] flex min-w-0 flex-col items-center gap-2 text-center"
                        key={label}
                      >
                        <span
                          className={`grid size-9 place-items-center rounded-full border md:size-10 ${
                            reached
                              ? "border-[#9a7352] bg-[#9a7352] text-[#fbf9f6]"
                              : "border-[#e3dbd1] bg-[#fbf9f6] text-[#b5aa9c]"
                          }`}
                        >
                          {showHouse ? (
                            <House size={15} strokeWidth={1.75} />
                          ) : reached ? (
                            <Check size={15} strokeWidth={2.25} />
                          ) : (
                            <PendingIcon size={14} strokeWidth={1.75} />
                          )}
                        </span>
                        <strong
                          className={`max-w-[4.8rem] text-[10px] font-semibold leading-tight sm:max-w-none sm:text-[11px] md:text-[13px] ${
                            reached ? "text-[#2c2926]" : "text-[#9a948b]"
                          }`}
                        >
                          {label}
                        </strong>
                        <small
                          className={`text-[9px] leading-tight sm:text-[10px] md:text-xs ${
                            reached ? "text-[#6f675d]" : "text-[#b5aa9c]"
                          }`}
                        >
                          {dates[step]}
                        </small>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="mt-8 flex flex-col gap-5 border-t border-[#e3dbd1] pt-5 md:flex-row md:items-end md:justify-between md:gap-6">
                <div className="flex flex-wrap items-start gap-x-12 gap-y-4 text-sm">
                  <div>
                    <p className="text-[11px] text-[#8a7350]">
                      Courier partner
                    </p>
                    <p className="mt-1.5 inline-flex items-center gap-2 font-medium text-[#2c2926]">
                      <Truck
                        size={15}
                        strokeWidth={1.75}
                        className="text-[#9a7352]"
                        aria-hidden
                      />
                      {courierLabel()}
                    </p>
                  </div>
                </div>

                {awb ? (
                  <div>
                    <p className="text-[11px] text-[#8a7350]">
                      AWB / Tracking number
                    </p>
                    <p className="mt-1.5 inline-flex items-center gap-2 font-medium tracking-wide text-[#2c2926]">
                      <span className="break-all">{awb}</span>
                      <CopyAwb awb={awb} />
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] text-[#8a7350]">Tracking</p>
                    <p className="mt-1.5 text-[#6f675d]">
                      Waybill will appear once the order ships.
                    </p>
                  </div>
                )}

                {showDelhiveryTrack && awb ? (
                  <div className="group relative shrink-0 md:pb-0.5">
                    <a
                      href={delhiveryTrackUrl(awb)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View live shipment updates on Delhivery"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#9a7352] px-5 text-sm font-medium text-white transition-colors hover:bg-[#85603f]"
                    >
                      <Info size={15} strokeWidth={2} aria-hidden />
                      Track on Delhivery
                      <ExternalLink size={14} strokeWidth={2} aria-hidden />
                    </a>
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[14rem] -translate-x-1/2 rounded-lg bg-[#2c2926] px-3 py-2 text-left text-[11px] leading-4 text-[#f6f1ea] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      View live shipment updates on Delhivery.
                    </span>
                  </div>
                ) : null}
              </div>
            </section>

            <div
              id="details"
              className="mt-4 grid scroll-mt-28 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]"
            >
              <section className={CARD}>
                <h2 className="font-serif text-xl font-medium text-[#2c2926]">
                  Items ordered{" "}
                  <span className="text-sm font-normal text-[#6f675d]">
                    ({order.items.length})
                  </span>
                </h2>
                <ul className="mt-1">
                  {order.items.map((item) => (
                    <li
                      className="flex items-center gap-3 border-b border-[#efede6] py-4 last:border-0 sm:gap-5"
                      key={`${item.productId}-${item.variant}`}
                    >
                      <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#f6f3ee] sm:size-[4.25rem]">
                        {item.image ? (
                          <Media
                            src={item.image}
                            alt=""
                            sizes="68px"
                            className="object-cover"
                          />
                        ) : (
                          <Package size={18} className="text-[#CBAC7C]" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-[15px] font-medium leading-snug text-[#2c2926]">
                          {item.name}
                        </strong>
                        <span className="mt-0.5 block text-xs leading-5 text-[#6f675d]">
                          {item.variant}
                        </span>
                        <span className="mt-1 block text-xs text-[#6f675d] sm:hidden">
                          Qty: {item.quantity}
                        </span>
                      </span>
                      <span className="hidden w-16 shrink-0 text-center text-sm text-[#6f675d] sm:block">
                        Qty: {item.quantity}
                      </span>
                      <span className="w-[4.5rem] shrink-0 text-right text-sm font-medium text-[#2c2926] sm:w-20">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex flex-col gap-5 border-t border-[#e3dbd1] pt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
                  <div className="min-w-0 flex-1">
                    <h2 className="inline-flex items-center gap-2 text-base font-medium text-[#2c2926]">
                      <MapPin
                        size={15}
                        strokeWidth={1.75}
                        className="text-[#9a7352]"
                        aria-hidden
                      />
                      Shipping to
                    </h2>
                    <div className="mt-2.5 text-sm leading-6 text-[#4e4943]">
                      <p className="font-medium text-[#2c2926]">
                        {order.address.fullName}
                      </p>
                      <p className="mt-0.5">
                        {order.address.address1}
                        {order.address.address2
                          ? `, ${order.address.address2}`
                          : ""}
                      </p>
                      <p>
                        {order.address.city}
                        {order.address.postalCode
                          ? ` - ${order.address.postalCode}`
                          : ""}
                      </p>
                      <p>{order.address.country}</p>
                    </div>
                  </div>
                  {(order.address.phone || order.address.email) ? (
                    <div className="flex shrink-0 flex-col gap-2.5 text-sm text-[#4e4943] sm:items-start sm:pt-0.5">
                      {order.address.phone ? (
                        <p className="flex items-center gap-2.5">
                          <Phone
                            size={15}
                            strokeWidth={1.75}
                            className="shrink-0 text-[#9a7352]"
                            aria-hidden
                          />
                          <span className="break-all">{order.address.phone}</span>
                        </p>
                      ) : null}
                      {order.address.email ? (
                        <p className="flex items-center gap-2.5">
                          <Mail
                            size={15}
                            strokeWidth={1.75}
                            className="shrink-0 text-[#9a7352]"
                            aria-hidden
                          />
                          <span className="break-all">{order.address.email}</span>
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>

              <aside className={`relative z-10 h-fit ${CARD}`}>
                <h2 className="font-serif text-xl font-medium text-[#2c2926]">
                  Payment summary
                </h2>
                <div className="mt-4 space-y-2.5 text-sm text-[#4e4943]">
                  <div className="flex justify-between gap-4">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 ? (
                    <div className="flex justify-between gap-4">
                      <span>Offer</span>
                      <span className="text-[#8a4b3c]">
                        −{formatPrice(order.discount)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <span>Shipping</span>
                    <span
                      className={
                        order.shipping === 0
                          ? "font-medium text-[#4f6b45]"
                          : undefined
                      }
                    >
                      {order.shipping === 0
                        ? "Free"
                        : formatPrice(order.shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-[#e3dbd1] pt-3 text-[#2c2926]">
                    <span className="font-medium">Total</span>
                    <strong className="text-lg font-semibold">
                      {formatPrice(order.total)}
                    </strong>
                  </div>
                </div>

                <div className="mt-5 space-y-3.5 border-t border-[#e3dbd1] pt-4 text-sm">
                  <div className="flex items-start gap-2.5 text-[#4e4943]">
                    <CreditCard
                      size={16}
                      strokeWidth={1.75}
                      className="mt-0.5 shrink-0 text-[#9a7352]"
                    />
                    <div>
                      <p className="text-[11px] text-[#8a7350]">
                        Payment method
                      </p>
                      <p className="mt-0.5 font-medium text-[#2c2926]">
                        {serverOrder?.payment === "cod" ||
                        order.status === "Pending"
                          ? "Pay on delivery"
                          : "Razorpay (UPI / Cards / Wallet)"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#4e4943]">
                    <Check
                      size={16}
                      strokeWidth={2}
                      className={`mt-0.5 shrink-0 ${paidOnline ? "text-[#4f6b45]" : "text-[#9a7352]"}`}
                    />
                    <div>
                      <p className="text-[11px] text-[#8a7350]">
                        Payment status
                      </p>
                      <p className="mt-0.5 font-medium text-[#2c2926]">
                        {serverOrder?.payment === "cod" ||
                        order.status === "Pending"
                          ? status
                          : paidOnline
                            ? "Paid online"
                            : status}
                      </p>
                    </div>
                  </div>
                </div>

                {serverOrder && customerCanCancel(serverOrder) ? (
                  <div className="mt-5 border-t border-[#e3dbd1] pt-4">
                    {confirmCancel ? (
                      <div>
                        <p className="text-sm leading-6 text-[#4e4943]">
                          Cancel this order? It has not been dispatched yet.
                        </p>
                        {cancelError ? (
                          <p className="mt-2 text-sm text-[#8a4b3c]">
                            {cancelError}
                          </p>
                        ) : null}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={cancelling}
                            onClick={() => {
                              setCancelling(true);
                              setCancelError("");
                              fetch("/api/checkout/cancel", {
                                method: "POST",
                                headers: csrfHeaders(),
                                body: JSON.stringify({
                                  orderId: serverOrder.id,
                                }),
                              })
                                .then(async (response) => {
                                  const body = await response.json();
                                  if (!response.ok) {
                                    throw new Error(
                                      body.error ||
                                        "This order could not be cancelled.",
                                    );
                                  }
                                  if (body.order) {
                                    setServerOrder(body.order);
                                    setStatus(orderStatus(body.order));
                                    store.rememberOrder(body.order);
                                  }
                                  setConfirmCancel(false);
                                })
                                .catch((error: Error) =>
                                  setCancelError(error.message),
                                )
                                .finally(() => setCancelling(false));
                            }}
                            className="h-10 flex-1 rounded-full bg-[#8a4b3c] text-sm text-white disabled:opacity-60"
                          >
                            {cancelling ? "Cancelling…" : "Confirm cancel"}
                          </button>
                          <button
                            type="button"
                            disabled={cancelling}
                            onClick={() => {
                              setConfirmCancel(false);
                              setCancelError("");
                            }}
                            className="h-10 flex-1 rounded-full border border-[#e3dbd1] text-sm text-[#2c2926]"
                          >
                            Keep order
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmCancel(true)}
                        className="h-10 w-full rounded-full border border-[#e3dbd1] text-sm text-[#8a4b3c] transition-colors hover:bg-[#faf6f1]"
                      >
                        Cancel order
                      </button>
                    )}
                  </div>
                ) : null}

                <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-[#f6efe4] px-3.5 py-3 text-sm leading-5 text-[#6f5a3e]">
                  <Leaf
                    size={15}
                    strokeWidth={1.75}
                    className="mt-0.5 shrink-0 text-[#9a7352]"
                    aria-hidden
                  />
                  <p>Thank you for supporting sustainable beauty.</p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
