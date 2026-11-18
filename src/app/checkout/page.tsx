"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Leaf, LockKeyhole, Mail, Phone, Truck, User } from "lucide-react";
import CheckoutShell from "@/components/checkout/CheckoutShell";
import OrderSummary from "@/components/checkout/OrderSummary";
import { trackBeginCheckout } from "@/lib/analytics";
import {
  assumedDeliveryPin,
  CONTACT_STORAGE_KEY,
  noteCheckoutOwner,
  retainCheckoutDraft,
  type CheckoutContact,
} from "@/lib/checkout";
import { notifyShippingQuote, prefetchShippingQuote } from "@/lib/checkout/shippingQuoteCache";
import { useStore } from "@/lib/store";

function localPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function quoteItems(cart: { productId: string; variantLabel: string; quantity: number }[]) {
  return cart.map((item) => ({
    productId: item.productId,
    variantLabel: item.variantLabel,
    quantity: item.quantity,
  }));
}

export default function CheckoutContactPage() {
  const router = useRouter();
  const store = useStore();
  const user = store.currentUser;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const bagKey = store.cart.map((item) => `${item.productId}:${item.variantLabel}:${item.quantity}`).join("|");

  useEffect(() => {
    if (!store.ready) return;
    retainCheckoutDraft(user?.id ?? null);
    try {
      const saved = JSON.parse(sessionStorage.getItem(CONTACT_STORAGE_KEY) || "null") as CheckoutContact | null;
      if (saved?.name) {
        setName(saved.name);
        setEmail(saved.email);
        setPhone(saved.phone);
        return;
      }
    } catch {
      sessionStorage.removeItem(CONTACT_STORAGE_KEY);
    }
    if (!user) {
      setName("");
      setEmail("");
      setPhone("");
      return;
    }
    setName(user.name || "");
    setEmail(user.email || "");
    setPhone(localPhone(user.phone || ""));
  }, [store.ready, user]);

  useEffect(() => {
    if (!store.ready || !store.cart.length) return;
    trackBeginCheckout({ cart: store.cart, categories: store.categories });
  }, [store.ready, store.cart, store.categories]);

  useEffect(() => {
    if (!store.ready) return;
    const pin = assumedDeliveryPin(user);
    if (!/^\d{6}$/.test(pin) || !store.cart.length) {
      notifyShippingQuote({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    notifyShippingQuote({ status: "loading", postalCode: pin });
    void prefetchShippingQuote({
      postalCode: pin,
      couponCode: store.couponCode,
      items: quoteItems(store.cart),
      signal: controller.signal,
    }).then((body) => {
      if (controller.signal.aborted) return;
      notifyShippingQuote({ status: body && !body.error ? "ready" : "idle", postalCode: pin });
      window.dispatchEvent(new Event("silkknot-shipping"));
    });
    return () => {
      controller.abort();
    };
  }, [store.ready, user, bagKey, store.couponCode]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const contact: CheckoutContact = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: localPhone(phone),
    };
    if (contact.name.length < 2) {
      setError("Enter the name for this order.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      setError("Enter an email for the order receipt.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(contact.phone)) {
      setError("Enter a 10-digit mobile number.");
      return;
    }
    noteCheckoutOwner(user?.id ?? null);
    sessionStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(contact));
    const pin = assumedDeliveryPin(user);
    if (/^\d{6}$/.test(pin) && store.cart.length) {
      void prefetchShippingQuote({
        postalCode: pin,
        couponCode: store.couponCode,
        items: quoteItems(store.cart),
      });
    }
    router.push("/checkout/shipping");
  }

  return (
    <CheckoutShell active={0} title="Almost there!" subtitle="Let’s get your order to you.">
      <div className="checkoutGrid">
        <section className="formCard">
          <div className="sectionTitle">
            <span className="shipSectionIcon" aria-hidden>
              <User size={18} strokeWidth={2} />
            </span>
            <div>
              <h2>Contact information</h2>
              <p>We’ll use this to send your order updates and delivery details.</p>
            </div>
          </div>
          <form onSubmit={submit}>
            <div className="fieldGrid">
              <label className="field full iconField">
                Full name
                <User size={16} strokeWidth={2} aria-hidden />
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" />
              </label>
              <label className="field full iconField">
                Email address
                <Mail size={16} strokeWidth={2} aria-hidden />
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="name@email.com" />
              </label>
              <label className="field full iconField">
                Mobile number
                <Phone size={16} strokeWidth={0} fill="currentColor" aria-hidden />
                <input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" inputMode="numeric" placeholder="10-digit mobile number" />
              </label>
            </div>
            {error ? <p className="errorText">{error}</p> : null}
            <div className="buttonRow shipNavRow">
              <button className="textBackButton" type="button" onClick={() => router.push("/shop")}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="primaryButton" type="submit">
                Continue to delivery <ArrowRight size={17} />
              </button>
            </div>
          </form>
          <ul className="trustRow">
            <li><LockKeyhole size={16} strokeWidth={2} /> <span><strong>Secure checkout</strong>Your details stay protected</span></li>
            <li><Truck size={16} strokeWidth={2} /> <span><strong>Fair delivery</strong>To the address you choose</span></li>
            <li><Leaf size={16} strokeWidth={2} /> <span><strong>Botanical care</strong>Made for daily rituals</span></li>
          </ul>
        </section>
        <OrderSummary />
      </div>
    </CheckoutShell>
  );
}
