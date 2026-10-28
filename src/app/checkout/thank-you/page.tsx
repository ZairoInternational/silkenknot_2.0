"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Truck } from "lucide-react";
import { PendingCover } from "@/components/PendingCover";
import { itemFromCartLine, trackPurchase } from "@/lib/analytics";
import { csrfHeaders } from "@/lib/auth/browser";
import { ORDER_STORAGE_KEY, type CheckoutDraft } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { deliveryBy } from "@/lib/shipping/estimate";
import { useStore } from "@/lib/store";
import type { Order } from "@/lib/types";

/**
 * Purchase fires only after checkout has already confirmed the order server-side
 * (prepaid verify / COD place) and this page loads that order.
 * Deduped by order id in localStorage across refresh/revisit.
 */
function reportPurchase(order: CheckoutDraft) {
  trackPurchase({
    transactionId: order.id,
    value: order.total,
    shipping: order.shipping,
    items: order.items.map((item) =>
      itemFromCartLine({
        id: `${item.productId}:${item.variant}`,
        productId: item.productId,
        slug: "",
        name: item.name,
        image: item.image,
        categoryId: "",
        variantLabel: item.variant,
        price: item.price,
        quantity: item.quantity,
      }),
    ),
  });
}

function draftFrom(order: Order, userId: string): CheckoutDraft {
  return {
    id: order.id,
    number: order.number,
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      variant: item.variantLabel,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    shipping: order.shipping,
    total: order.total,
    address: {
      fullName: order.customerName,
      email: order.email,
      phone: order.phone,
      address1: order.address.line1,
      address2: order.address.line2,
      city: order.address.city,
      postalCode: order.address.postal,
      country: order.address.country,
    },
    paymentMethod: order.payment === "card" ? "card" : "razorpay",
    paymentId: order.paymentId,
    couponCode: order.couponCode,
    status: order.payment === "cod" ? "Pending" : "Paid",
    createdAt: order.createdAt,
    userId,
    deliveryEstimate: order.shipment?.estimate,
  };
}

export default function ThankYouPage() {
  const router = useRouter();
  const store = useStore();
  const userId = store.currentUser?.id ?? null;
  const [order, setOrder] = useState<CheckoutDraft | null>(null);

  useEffect(() => {
    if (!store.ready || !userId) return;
    let cancelled = false;
    let saved: CheckoutDraft | null = null;
    try {
      const raw = sessionStorage.getItem(ORDER_STORAGE_KEY);
      if (raw) saved = JSON.parse(raw) as CheckoutDraft;
    } catch {
      saved = null;
    }
    if (!saved?.id || saved.userId !== userId) {
      sessionStorage.removeItem(ORDER_STORAGE_KEY);
      router.replace("/shop");
      return;
    }
    const owned = saved;
    fetch(`/api/checkout/order?id=${encodeURIComponent(owned.id)}`, { headers: csrfHeaders(false) })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = await response.json() as { order?: Order };
        return body.order || null;
      })
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded || loaded.userId !== userId) {
          sessionStorage.removeItem(ORDER_STORAGE_KEY);
          router.replace("/shop");
          return;
        }
        const next = draftFrom(loaded, userId);
        sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
        setOrder(next);
        reportPurchase(next);
      })
      .catch(() => {
        if (cancelled) return;
        setOrder(owned);
        // Session draft is written only after server confirmation in checkout/review.
        reportPurchase(owned);
      });
    return () => {
      cancelled = true;
    };
  }, [router, store.ready, userId]);

  if (!order || order.userId !== userId) {
    return <PendingCover message="Opening your order…" />;
  }

  const name = order.address.fullName.split(" ")[0];
  const arrival = order.deliveryEstimate ? deliveryBy(order.deliveryEstimate).by : "";
  const status = order.status === "Paid" ? "Paid" : "Pay on delivery";

  return (
    <main className="thankYouPage">
      <ThankBranches />
      <div className="thankBody">
        <div className="successMark"><Check size={28} strokeWidth={1.75} /></div>
        <h1>Thank you{name ? `, ${name}` : ""}</h1>
        <p className="thankLead">
          {order.status === "Paid"
            ? "Your order has been placed."
            : "Your order has been placed. Pay the courier when it arrives."}
        </p>
        <p className="thankSaved">Saved in your account for {order.address.email}</p>
        <p className="thankOrder">Order #{order.number || order.id}</p>
        <p className="thankMeta">{formatPrice(order.total || 0)} · {status}</p>
        <div className="thankActions">
          <Link className="primaryButton linkButton" href={`/orders/${encodeURIComponent(order.id)}`}>View order details</Link>
          <Link className="secondaryButton linkButton" href="/shop">Continue shopping</Link>
        </div>
        <div className="arrivalCard">
          <span className="arrivalIcon"><CalendarDays size={18} /></span>
          <div>
            <strong>Estimated delivery</strong>
            <p>{arrival ? `Arrives by ${arrival}` : "A date will show once your order is dispatched."}</p>
          </div>
          <Truck size={18} />
        </div>
      </div>
    </main>
  );
}

function ThankBranches() {
  return (
    <div className="thankBranches" aria-hidden="true">
      <Sprig className="branch branchTopLeft" />
      <Sprig className="branch branchTopRight" />
      <Sprig className="branch branchBottomLeft" />
      <Sprig className="branch branchBottomRight" />
    </div>
  );
}

function Sprig({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 180 260" fill="none">
      <path d="M28 248C46 190 42 132 78 78C96 50 118 28 154 12" stroke="currentColor" strokeWidth="1.4" />
      <path d="M62 176C86 162 104 166 122 148" stroke="currentColor" strokeWidth="1.2" />
      <path d="M74 132C98 112 118 116 136 96" stroke="currentColor" strokeWidth="1.2" />
      <path d="M92 86C112 68 128 70 146 52" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="118" cy="142" rx="16" ry="7" transform="rotate(-28 118 142)" fill="currentColor" opacity="0.35" />
      <ellipse cx="132" cy="92" rx="15" ry="6.5" transform="rotate(-36 132 92)" fill="currentColor" opacity="0.28" />
      <ellipse cx="148" cy="48" rx="14" ry="6" transform="rotate(-42 148 48)" fill="currentColor" opacity="0.22" />
      <ellipse cx="70" cy="168" rx="13" ry="5.5" transform="rotate(18 70 168)" fill="currentColor" opacity="0.3" />
      <ellipse cx="96" cy="78" rx="11" ry="5" transform="rotate(24 96 78)" fill="currentColor" opacity="0.22" />
    </svg>
  );
}
