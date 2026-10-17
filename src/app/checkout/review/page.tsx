"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import CheckoutShell from "@/components/checkout/CheckoutShell";
import { PendingCover } from "@/components/PendingCover";
import { DeliveryChargeNote } from "@/components/checkout/DeliveryChargeNote";
import OrderSummary from "@/components/checkout/OrderSummary";
import {
  ADDRESS_STORAGE_KEY,
  IDEMPOTENCY_STORAGE_KEY,
  ORDER_STORAGE_KEY,
  PAYMENT_STORAGE_KEY,
  SHIPPING_SELECTION_KEY,
  TERMS_STORAGE_KEY,
  applyBagDiscount,
  rememberPrepaidShipping,
  retainCheckoutDraft,
  shippingForPayment,
  type CheckoutDraft,
  type ShippingAddress,
  type ShippingSelection,
} from "@/lib/checkout";
import { csrfHeaders } from "@/lib/auth/browser";
import { couponDiscountPaise, subtotal } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Order, Product } from "@/lib/types";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

export default function ReviewPage() {
  const router = useRouter();
  const store = useStore();
  const userId = store.currentUser?.id ?? null;
  const [address, setAddress] = useState<ShippingAddress | null>(null);
  const [method, setMethod] = useState<"razorpay" | "cod">("razorpay");
  const [selection, setSelection] = useState<ShippingSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [hold, setHold] = useState<null | "placing" | "gateway" | "confirming">(null);
  const paying = useRef(false);
  const settled = useRef(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  const cartKey = store.cart.map((item) => `${item.productId}:${item.variantLabel}:${item.quantity}`).join("|");

  useEffect(() => {
    if (!store.ready || hold) return;
    retainCheckoutDraft(userId);
    if (!cartKey) {
      const savedOrder = sessionStorage.getItem(ORDER_STORAGE_KEY);
      router.replace(savedOrder ? "/checkout/thank-you" : "/shop");
      return;
    }
    try {
      const raw = sessionStorage.getItem(ADDRESS_STORAGE_KEY);
      if (raw) setAddress(JSON.parse(raw));
      else setAddress(null);
      const saved = sessionStorage.getItem(PAYMENT_STORAGE_KEY) === "cod" ? "cod" : "razorpay";
      setMethod(saved);
      const shipping = sessionStorage.getItem(SHIPPING_SELECTION_KEY);
      if (!shipping) {
        router.replace("/checkout/shipping");
        return;
      }
      setSelection(shippingForPayment(JSON.parse(shipping) as ShippingSelection, saved));
    } catch {
      setAddress(null);
    }
  }, [router, store.ready, userId, cartKey, hold]);

  useEffect(() => {
    return () => rememberPrepaidShipping();
  }, []);

  function choosePay(next: "razorpay" | "cod") {
    setMethod(next);
    if (!selection) return;
    const shown = shippingForPayment(selection, next);
    setSelection(shown);
    sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
    sessionStorage.setItem(SHIPPING_SELECTION_KEY, JSON.stringify(shippingForPayment(selection, "razorpay")));
    sessionStorage.setItem(PAYMENT_STORAGE_KEY, next);
    window.dispatchEvent(new Event("silkknot-shipping"));
  }

  function remember(order: Order, products?: Product[]) {
    const saved: CheckoutDraft = {
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
        state: order.address.state,
        postalCode: order.address.postal,
        country: order.address.country,
      },
      paymentMethod: order.payment === "card" ? "card" : "razorpay",
      paymentId: order.paymentId,
      couponCode: order.couponCode,
      status: order.payment === "cod" ? "Pending" : "Paid",
      createdAt: order.createdAt,
      userId: store.currentUser?.id || order.userId || "",
      deliveryEstimate: order.shipment?.estimate,
    };
    sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(saved));
    sessionStorage.removeItem(SHIPPING_SELECTION_KEY);
    setHold("confirming");
    store.acceptServerOrder(order, products);
    router.replace("/checkout/thank-you");
  }

  async function placeOrder() {
    if (!selection || !address) {
      router.push("/checkout/shipping");
      return;
    }
    if (!accepted) {
      setError("Please agree to the Terms, Privacy Policy, and Shipping and Returns policies.");
      return;
    }
    sessionStorage.setItem(TERMS_STORAGE_KEY, "true");
    if (!store.cart.length) {
      setError("Your bag is empty.");
      return;
    }
    if (paying.current) return;
    paying.current = true;
    settled.current = false;
    setBusy(true);
    setHold("placing");
    setError("");
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
      let idempotencyKey = sessionStorage.getItem(IDEMPOTENCY_STORAGE_KEY) || "";
      if (!/^[A-Za-z0-9_-]{16,80}$/.test(idempotencyKey)) {
        idempotencyKey = crypto.randomUUID();
        sessionStorage.setItem(IDEMPOTENCY_STORAGE_KEY, idempotencyKey);
      }
      const createRes = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          items: store.cart.map((item) => ({ productId: item.productId, variantLabel: item.variantLabel, quantity: item.quantity })),
          couponCode: store.couponCode,
          address,
          paymentMethod: method,
          idempotencyKey,
          shippingQuoteId: selection.quoteId,
          shippingOptionId: selection.optionId,
          expectedAmountPaise: applyBagDiscount(selection, (() => {
            const coupon = store.coupons.find((item) => item.code === store.couponCode && item.active);
            return coupon ? couponDiscountPaise(store.cart, coupon) : 0;
          })(), method, Math.round(subtotal(store.cart) * 100)).amountPaise,
        }),
      });
      const data = await createRes.json();
      if (!createRes.ok) {
        if (attempt === 0 && data.error === "This checkout attempt does not match the bag. Start again.") {
          sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
          continue;
        }
        setHold(null);
        throw new Error(data.error || "Could not start checkout.");
      }
      if (data.placed && data.order) {
        sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
        remember(data.order as Order, data.products);
        return;
      }
      if (data.verified && data.order) {
        sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
        remember(data.order as Order, data.products);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        setHold("gateway");
        const checkout = new window.Razorpay!({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: "Silken Knot",
          description: "Your Silken Knot order",
          order_id: data.razorpayOrderId,
          prefill: { name: address.fullName, email: address.email, contact: address.phone },
          notes: { address: `${address.address1}, ${address.city}, ${address.state} ${address.postalCode}` },
          theme: { color: "#CBAC7C" },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            settled.current = true;
            setHold("confirming");
            try {
              const verifyRes = await fetch("/api/checkout/verify", {
                method: "POST",
                headers: csrfHeaders(),
                body: JSON.stringify({ ...response, checkoutOrderId: data.orderId }),
              });
              const verified = await verifyRes.json();
              if (!verifyRes.ok || !verified.verified || !verified.order) {
                throw new Error(verified.error || "Payment is not confirmed yet. Check your account before paying again.");
              }
              remember(verified.order as Order, verified.products);
              sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
            } catch (failure) {
              paying.current = false;
              settled.current = false;
              setHold(null);
              setError(failure instanceof Error ? failure.message : "Could not verify payment.");
              setBusy(false);
            }
          },
          modal: {
            ondismiss: () => {
              if (settled.current) return;
              paying.current = false;
              setHold(null);
              setBusy(false);
            },
          },
        });
        checkout.on("payment.failed", (response) => {
          if (settled.current) return;
          paying.current = false;
          setHold(null);
          setError(response?.error?.description || "Payment failed. Please try again.");
          setBusy(false);
        });
        checkout.open();
      };
      script.onerror = () => {
        paying.current = false;
        setHold(null);
        setError("Could not load secure payment checkout. Please try again.");
        setBusy(false);
      };
      document.body.appendChild(script);
      return;
      }
    } catch (failure) {
      paying.current = false;
      setHold(null);
      setError(failure instanceof Error ? failure.message : "Unable to place order.");
      setBusy(false);
    }
  }

  const holdMessage = hold === "confirming"
    ? "Your order is confirmed. Opening your confirmation…"
    : hold === "gateway"
      ? "Complete payment in the secure window. This page stays locked until it finishes."
      : "Placing your order…";

  return (
    <CheckoutShell active={2} title="One last look" subtitle="Please make sure everything looks right before placing your order.">
      {hold ? <PendingCover message={holdMessage} underModal={hold === "gateway"} /> : null}
      <div className="checkoutGrid" inert={hold ? true : undefined} hidden={hold === "placing" || hold === "confirming"}>
        <section className="formCard">
          <div className="reviewBlock">
            <div className="reviewHeading">
              <h2>Delivery address</h2>
              <button type="button" onClick={() => router.push("/checkout/shipping")}>Edit</button>
            </div>
            {address ? (
              <p>
                {address.fullName}<br />
                {address.address1}{address.address2 ? `, ${address.address2}` : ""}<br />
                {address.city}, {address.state} {address.postalCode}<br />
                {address.country}<br />
                {address.email} · {address.phone}
              </p>
            ) : (
              <p>Loading address…</p>
            )}
          </div>
          <div className="reviewBlock">
            <div className="reviewHeading">
              <h2>Payment</h2>
            </div>
            <p>
              {method === "cod" ? "You pay the courier when the order arrives." : "You pay when you place the order."}
            </p>
            {selection?.codEligible ? (
              <div className="paymentOptions">
                <button type="button" className={`paymentOption ${method === "razorpay" ? "selected" : ""}`} onClick={() => choosePay("razorpay")}>
                  <span className="radioDot" />
                  <span className="paymentCopy"><strong>Pay now</strong><small>Taken when you place the order</small></span>
                </button>
                <button type="button" className={`paymentOption ${method === "cod" ? "selected" : ""}`} onClick={() => choosePay("cod")}>
                  <span className="radioDot" />
                  <span className="paymentCopy"><strong>Pay on delivery</strong><small>Pay the courier when the order arrives</small></span>
                </button>
              </div>
            ) : null}
          </div>
          {selection ? (
            <div className="reviewBlock">
              <div className="reviewHeading"><h2>Shipping <DeliveryChargeNote selection={selection} /></h2><button type="button" onClick={() => router.push("/checkout/shipping")}>Edit</button></div>
              <p>{selection.label}{selection.estimate ? ` · ${selection.estimate}` : ""}</p>
            </div>
          ) : null}
          <div className="termsBox">
            <label className="checkLine termsCheck">
              <input type="checkbox" checked={accepted} onChange={(event) => { setAccepted(event.target.checked); setError(""); }} />
              <span>
                I agree to the <a href="/terms" target="_blank">Terms</a>, <a href="/privacy" target="_blank">Privacy Policy</a>, <a href="/shipping" target="_blank">Shipping</a>, and <a href="/returns" target="_blank">Returns</a> policies.
              </span>
            </label>
          </div>
          {error ? <p className="errorText">{error}</p> : null}
          <div className="buttonRow">
            <button className="secondaryButton" type="button" onClick={() => router.push("/checkout/shipping")}><ArrowLeft size={16} /> Back</button>
            <button className="primaryButton" type="button" disabled={busy || !address || !selection || !accepted} onClick={placeOrder}>
              {busy ? "Preparing checkout…" : method === "cod" ? "Place order" : "Pay now"} <LockKeyhole size={16} />
            </button>
          </div>
          <p className="formFine">Do not refresh while payment is being processed. You’ll see confirmation after the server verifies payment.</p>
        </section>
        <OrderSummary />
      </div>
    </CheckoutShell>
  );
}
