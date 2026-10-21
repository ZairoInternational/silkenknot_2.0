"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, House, Package, Truck } from "lucide-react";
import { orderStatus } from "@/components/account/Screens";
import { Media } from "@/components/ui";
import { csrfHeaders } from "@/lib/auth/browser";
import { ORDER_STORAGE_KEY, type CheckoutDraft } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { customerCanCancel, waybillProgress } from "@/lib/shipping/states";
import { useStore } from "@/lib/store";
import type { Order } from "@/lib/types";

function shipmentLabel(state?: string) {
  const labels: Record<string, string> = {
    not_created: "Being prepared",
    pending: "Being prepared",
    booked: "Booked",
    pickup_scheduled: "Pickup scheduled",
    picked_up: "Picked up",
    in_transit: "On the way",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    delivery_failed: "Delivery attempted",
    cancelled: "Cancelled",
    rto_initiated: "Returning to us",
    rto_in_transit: "Returning to us",
    rto_delivered: "Returned",
    return_initiated: "Return started",
    returned: "Returned",
    exception: "Needs attention",
    unknown: "Being prepared",
  };
  return labels[state || ""] || "Being prepared";
}

const STEP_ICONS = [Check, Package, Truck, House] as const;

function shortDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "Asia/Kolkata" }).format(date);
}

function eventWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(date);
}

function placedOn(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" }).format(date);
}

function deliveryProgress(order: Order | null) {
  if (!order) return { index: 0, badge: "Confirmed", alert: false };
  if (order.status === "cancelled" || order.orderState === "cancelled" || order.paymentState === "cancelled" || order.paymentState === "failed") {
    return { index: -1, badge: "Cancelled", alert: true };
  }
  const state = order.shipment?.state;
  if (order.shipment?.awb) return waybillProgress(state);
  if (state === "rto_initiated" || state === "rto_in_transit" || state === "rto_delivered" || state === "return_initiated" || state === "returned" || order.status === "returned" || order.status === "return_requested") {
    return { index: 2, badge: "Returning", alert: true };
  }
  if (order.fulfillmentState === "delivered" || order.status === "delivered" || state === "delivered" || order.orderState === "completed") {
    return { index: 3, badge: "Delivered", alert: false };
  }
  if (order.fulfillmentState === "shipped" || order.status === "shipped" || state === "picked_up" || state === "in_transit" || state === "out_for_delivery") {
    return { index: 2, badge: state === "out_for_delivery" ? "On the way" : "Shipped", alert: false };
  }
  if (order.fulfillmentState === "packed" || order.status === "packed" || state === "booked" || state === "pickup_scheduled") {
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
    when(["picked_up", "in_transit", "out_for_delivery"]),
    when(["delivered"]),
  ];
  return dates.map((value, step) => (step <= index ? shortDate(value || (step === 0 ? createdAt : undefined)) : "—"));
}

export function OrderDetails({ id }: { id: string }) {
  const [order, setOrder] = useState<CheckoutDraft | null>(null);
  const [status, setStatus] = useState("Order received");
  const store = useStore();
  const [serverOrder, setServerOrder] = useState<Order | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    let cancelled = false;
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
        if (!response.ok) return null;
        const body = await response.json() as { order?: Order };
        return body.order || null;
      })
      .then((loaded) => {
        if (cancelled || !loaded) return;
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
            state: loaded.address.state,
            postalCode: loaded.address.postal,
            country: loaded.address.country,
          },
          paymentMethod: loaded.payment === "card" ? "card" : "razorpay",
          paymentId: loaded.paymentId,
          couponCode: loaded.couponCode,
          status: loaded.paymentState === "captured" || loaded.status === "confirmed" ? "Paid" : "Pending",
          createdAt: loaded.createdAt,
          userId: loaded.userId || "",
          deliveryEstimate: loaded.shipment?.estimate,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  const progress = deliveryProgress(serverOrder);
  const dates = stepDates(serverOrder, order?.createdAt || "", progress.index);
  const events = serverOrder?.shipment?.events || [];

  return (
    <main className="page-pad mx-auto w-full max-w-6xl px-4 pb-24 sm:px-5 lg:px-8">
      <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm text-[#8a7350]"><ArrowLeft size={15} /> Back to orders</Link>
      {!order ? (
        <section className="mt-6 rounded-2xl border border-[#e3dbd1] bg-white px-5 py-8 md:px-6">
          <h1 className="text-[1.75rem] font-medium tracking-tight text-[#2c2926]">Order details</h1>
          <p className="mt-2 break-all text-sm text-[#6f675d]">Order {id}</p>
          <h2 className="mt-6 text-lg font-medium text-[#2c2926]">Order not available on this device</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#6f675d]">This order is not on your account. Sign in with the same customer who paid, then open Account.</p>
        </section>
      ) : (
        <>
          <div className="mt-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[1.75rem] font-medium tracking-tight text-[#2c2926] md:text-3xl">Order details</h1>
              <p className="mt-2 text-sm text-[#6f675d]">Order #{order.number || id}{placedOn(order.createdAt) ? ` · Placed on ${placedOn(order.createdAt)}` : ""}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${progress.alert ? "bg-[#f6ece8] text-[#8a4b3c]" : "bg-[#f3ead8] text-[#8a7350]"}`}>{progress.badge}</span>
          </div>

          <section id="tracking" className="mt-6 scroll-mt-28 rounded-2xl border border-[#e3dbd1] bg-white p-4 md:p-5">
            <h2 className="text-lg font-medium text-[#2c2926]">Track order</h2>
            <div className="relative mt-5">
              <span className="absolute left-[12%] right-[12%] top-[14px] h-0.5 bg-[#e6e0d6] md:top-[18px]" />
              {progress.index > 0 ? <span className="absolute left-[12%] top-[14px] h-0.5 bg-[#8a7350] md:top-[18px]" style={{ width: `${(76 / 3) * progress.index}%` }} /> : null}
            <ol className="relative grid grid-cols-4 gap-1" aria-label="Delivery progress">
              {["Confirmed", "Processing", "Shipped", "Delivered"].map((label, step) => {
                const Icon = STEP_ICONS[step];
                const reached = progress.index >= 0 && step <= progress.index;
                return (
                  <li className="relative z-[1] flex min-w-0 flex-col items-center gap-1.5 text-center" key={label}>
                    <span className={`grid size-7 place-items-center rounded-full border md:size-9 ${reached ? "border-[#8a7350] bg-[#8a7350] text-[#fbf9f6]" : "border-[#e3dbd1] bg-[#fbf9f6] text-[#8a7350]"}`}>
                      <Icon size={14} />
                    </span>
                    <strong className={`text-[10px] font-semibold leading-tight md:text-[13px] ${reached ? "text-[#2c2926]" : "text-[#9a948b]"}`}>{label}</strong>
                    <small className={`text-[10px] md:text-xs ${reached ? "text-[#6f675d]" : "text-[#9a948b]"}`}>{dates[step]}</small>
                  </li>
                );
              })}
            </ol>
            </div>
            <dl className="mt-6 space-y-2 border-t border-[#e3dbd1] pt-4 text-sm text-[#4e4943]">
              {serverOrder?.shipment?.awb ? <div className="flex items-start justify-between gap-4"><dt className="text-[#6f675d]">Tracking number</dt><dd className="break-all text-right font-medium text-[#2c2926]">{serverOrder.shipment.awb}</dd></div> : null}
              <div className="flex items-start justify-between gap-4"><dt className="text-[#6f675d]">Delivery status</dt><dd className="text-right">{shipmentLabel(serverOrder?.shipment?.state)}</dd></div>
              {serverOrder?.shipment?.estimate ? <div className="flex items-start justify-between gap-4"><dt className="text-[#6f675d]">Expected</dt><dd className="text-right">{serverOrder.shipment.estimate.replace(/^Test · /, "")}</dd></div> : null}
            </dl>
            <button type="button" className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-[#e3dbd1] px-4 text-xs text-[#2c2926]" onClick={() => {
              fetch("/api/checkout/tracking", { method: "POST", headers: csrfHeaders(), body: JSON.stringify({ orderId: serverOrder?.id || id }) })
                .then((response) => response.json())
                .then((body) => { if (body.order) setServerOrder(body.order); });
            }}>Refresh tracking</button>
            {events.length ? (
              <ol className="mt-4 space-y-2">
                {events.map((event) => (
                  <li className="text-xs leading-5 text-[#6f675d]" key={`${event.at}-${event.providerStatus}`}>
                    {eventWhen(event.at)} · {event.providerStatus.replace(/^Test · /, "")}{event.location ? ` · ${event.location}` : ""}
                  </li>
                ))}
              </ol>
            ) : <p className="mt-4 text-sm text-[#6f675d]">No tracking events yet.</p>}
          </section>

          <div id="details" className="mt-4 grid scroll-mt-28 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
            <section className="rounded-2xl border border-[#e3dbd1] bg-white p-4 md:p-5">
              <h2 className="text-lg font-medium text-[#2c2926]">Items ordered <span className="text-sm font-normal text-[#6f675d]">({order.items.length})</span></h2>
              {order.items.map((item) => (
                <div className="flex items-start gap-3 border-b border-[#efede6] py-3 last:border-0" key={`${item.productId}-${item.variant}`}>
                  <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f6f3ee]">
                    {item.image ? <Media src={item.image} alt="" sizes="64px" className="object-cover" /> : <Package size={16} className="text-[#CBAC7C]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm text-[#2c2926]">{item.name}</strong>
                    <small className="mt-1 block text-xs text-[#6f675d]">{item.variant} · Qty {item.quantity}</small>
                  </span>
                  <span className="shrink-0 text-sm text-[#2c2926]">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <h2 className="mt-5 text-lg font-medium text-[#2c2926]">Shipping to</h2>
              <p className="mt-2 text-sm leading-6 text-[#4e4943]">
                {order.address.fullName}<br />
                {order.address.address1}{order.address.address2 ? `, ${order.address.address2}` : ""}<br />
                {order.address.city}, {order.address.state} {order.address.postalCode}<br />
                {order.address.country}<br />
                {order.address.email} · {order.address.phone}
              </p>
            </section>
            <aside className="h-fit rounded-2xl border border-[#e3dbd1] bg-white p-4 md:p-5">
              <h2 className="text-lg font-medium text-[#2c2926]">Payment summary</h2>
              <div className="mt-3 space-y-2 text-sm text-[#4e4943]">
                <div className="flex justify-between gap-4"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                {order.discount > 0 ? <div className="flex justify-between gap-4"><span>Offer</span><span>−{formatPrice(order.discount)}</span></div> : null}
                <div className="flex justify-between gap-4"><span>Shipping</span><span className={order.shipping === 0 ? "font-semibold text-[#1f7a4d]" : undefined}>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</span></div>
                <div className="flex justify-between gap-4 border-t border-[#e3dbd1] pt-3 text-[#2c2926]"><span>Total</span><strong className="text-lg font-semibold">{formatPrice(order.total)}</strong></div>
                <div className="flex justify-between gap-4"><span>Payment</span><span>{serverOrder?.payment === "cod" || order.status === "Pending" ? "Pay on delivery" : "Paid online"}</span></div>
              {serverOrder && customerCanCancel(serverOrder) ? (
                <div className="mt-5 border-t border-[#e3dbd1] pt-4">
                  {confirmCancel ? (
                    <div>
                      <p className="text-sm leading-6 text-[#4e4943]">Cancel this order? It has not been dispatched yet.</p>
                      {cancelError ? <p className="mt-2 text-sm text-[#8a4b3c]">{cancelError}</p> : null}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={cancelling}
                          onClick={() => {
                            setCancelling(true);
                            setCancelError("");
                            fetch("/api/checkout/cancel", { method: "POST", headers: csrfHeaders(), body: JSON.stringify({ orderId: serverOrder.id }) })
                              .then(async (response) => {
                                const body = await response.json();
                                if (!response.ok) throw new Error(body.error || "This order could not be cancelled.");
                                if (body.order) {
                                  setServerOrder(body.order);
                                  setStatus(orderStatus(body.order));
                                  store.rememberOrder(body.order);
                                }
                                setConfirmCancel(false);
                              })
                              .catch((error: Error) => setCancelError(error.message))
                              .finally(() => setCancelling(false));
                          }}
                          className="h-10 flex-1 rounded-full bg-[#8a4b3c] text-sm text-white disabled:opacity-60"
                        >
                          {cancelling ? "Cancelling…" : "Confirm cancel"}
                        </button>
                        <button type="button" disabled={cancelling} onClick={() => { setConfirmCancel(false); setCancelError(""); }} className="h-10 flex-1 rounded-full border border-[#e3dbd1] text-sm text-[#2c2926]">
                          Keep order
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmCancel(true)} className="h-10 w-full rounded-full border border-[#e3dbd1] text-sm text-[#8a4b3c]">
                      Cancel order
                    </button>
                  )}
                </div>
              ) : null}
                <div className="flex justify-between gap-4"><span>Status</span><span className="text-right">{status}</span></div>
              </div>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
