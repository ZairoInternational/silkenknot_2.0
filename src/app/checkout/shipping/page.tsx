"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import CheckoutShell from "@/components/checkout/CheckoutShell";
import OrderSummary from "@/components/checkout/OrderSummary";
import { csrfHeaders } from "@/lib/auth/browser";
import { ADDRESS_STORAGE_KEY, CONTACT_STORAGE_KEY, PAYMENT_STORAGE_KEY, SHIPPING_SELECTION_KEY, retainCheckoutDraft, type CheckoutContact, type ShippingAddress, type ShippingSelection } from "@/lib/checkout";
import { PinLookup } from "@/components/product/DeliveryChoice";
import { formatPrice } from "@/lib/format";
import { unavailablePinMessage } from "@/lib/shipping/estimate";
import { useStore } from "@/lib/store";
import type { Address, User } from "@/lib/types";

type SavedChoice = ShippingAddress & { id: string; label: string };

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

function toChoice(item: Address, user: User): SavedChoice {
  return {
    id: item.id,
    label: item.label || "Delivery",
    fullName: item.name || user.name || "",
    email: user.email || "",
    phone: item.phone || user.phone || "",
    address1: item.line1,
    address2: item.line2 || "",
    city: item.city || "",
    state: item.state || "",
    postalCode: item.postal || "",
    country: item.country || "India",
  };
}

function addressReadyForDelivery(value: ShippingAddress) {
  return Boolean(
    value.fullName.trim()
    && value.phone.trim()
    && value.address1.trim()
    && value.city.trim()
    && value.state.trim()
    && /^\d{6}$/.test(value.postalCode.trim()),
  );
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function readContact(): CheckoutContact | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CONTACT_STORAGE_KEY) || "null") as CheckoutContact | null;
    if (saved?.name && validEmail(saved.email) && /^[6-9]\d{9}$/.test(saved.phone)) return saved;
  } catch {
    sessionStorage.removeItem(CONTACT_STORAGE_KEY);
  }
  return null;
}

type ShippingOption = {
  id: "standard" | "express";
  label: string;
  detail: string;
  chargePaise: number;
  codChargePaise?: number | null;
  estimateRupees?: number | null;
  codEstimateRupees?: number | null;
  shippingDiscountPaise: number;
  estimate: string;
  estimateSource?: "store_policy" | "delhivery_tat" | "none";
  available: boolean;
};

export default function ShippingPage() {
  const router = useRouter();
  const store = useStore();
  const user = store.currentUser;
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Add an address to check delivery.");
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [quoteId, setQuoteId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [codEligible, setCodEligible] = useState(false);
  const [availableCodFeePaise, setAvailableCodFeePaise] = useState(0);
  const [subtotalPaise, setSubtotalPaise] = useState(0);
  const [discountPaise, setDiscountPaise] = useState(0);
  const [freeShippingPaise, setFreeShippingPaise] = useState(0);
  const [selected, setSelected] = useState<"standard" | "express" | "">("");
  const [checking, setChecking] = useState(false);
  const [contact, setContact] = useState<CheckoutContact | null>(null);
  const home = user?.addresses.find((item) => item.isDefault && item.line1) ?? user?.addresses.find((item) => item.line1);
  const chosen = user && home ? toChoice(home, user) : null;
  const addressPage = "/account/addresses?next=/checkout/shipping";
  const pin = chosen?.postalCode || "";
  const addressReady = Boolean(chosen && addressReadyForDelivery(chosen));
  const hasAddress = Boolean(chosen);
  const cartKey = store.cart.map((item) => `${item.productId}:${item.variantLabel}:${item.quantity}`).join("|");

  useEffect(() => {
    if (!store.ready) return;
    retainCheckoutDraft(user?.id ?? null);
    const saved = readContact();
    if (!saved) {
      router.replace("/checkout");
      return;
    }
    setContact(saved);
  }, [router, store.ready, user?.id]);

  useEffect(() => {
    if (!addressReady || !cartKey || !/^\d{6}$/.test(pin)) {
      setChecking(false);
      setOptions([]);
      setQuoteId("");
      setSelected("");
      setStatus(hasAddress ? "This address needs a name, phone, street, city, state, and 6-digit PIN." : "Add an address to check delivery.");
      return;
    }
    const controller = new AbortController();
    setChecking(true);
    setError("");
    void (async () => {
      try {
        const response = await fetch("/api/checkout/shipping-options", {
          method: "POST",
          headers: csrfHeaders(),
          signal: controller.signal,
          body: JSON.stringify({
            postalCode: pin,
            couponCode: store.couponCode,
            items: cartKey.split("|").filter(Boolean).map((row) => {
              const [productId, variantLabel, quantity] = row.split(":");
              return { productId, variantLabel, quantity: Number(quantity) };
            }),
          }),
        });
        const body = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setOptions([]);
          setQuoteId("");
          setSelected("");
          setStatus(body.code === "temporary" ? "Delivery could not be checked. Try again." : unavailablePinMessage(pin, "address"));
          return;
        }
        const next = (body.options || []) as ShippingOption[];
        setOptions(next);
        setQuoteId(body.quoteId || "");
        setExpiresAt(body.expiresAt || "");
        setCodEligible(Boolean(body.codEligible));
        setAvailableCodFeePaise(body.codFeePaise || 0);
        setSubtotalPaise(body.subtotalPaise || 0);
        setDiscountPaise(body.discountPaise || 0);
        setFreeShippingPaise(body.freeShippingPaise || 0);
        setStatus(next.length ? "Delivery is available." : unavailablePinMessage(pin, "address"));
        setSelected((current) => (next.some((option) => option.id === current) ? current : next[0]?.id || ""));
      } catch (failure) {
        if ((failure as { name?: string }).name === "AbortError" || controller.signal.aborted) return;
        setOptions([]);
        setQuoteId("");
        setSelected("");
        setStatus("Delivery could not be checked. Try again.");
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    })();
    return () => controller.abort();
  }, [pin, store.couponCode, cartKey, addressReady, hasAddress]);

  useEffect(() => {
    const option = options.find((item) => item.id === selected);
    if (!option || !quoteId) {
      sessionStorage.removeItem(SHIPPING_SELECTION_KEY);
      window.dispatchEvent(new Event("silkknot-shipping"));
      return;
    }
    const selection: ShippingSelection = {
      quoteId,
      optionId: option.id,
      label: option.label,
      chargePaise: option.chargePaise,
      prepaidChargePaise: option.chargePaise,
      codChargePaise: option.codChargePaise,
      estimateRupees: option.estimateRupees,
      codEstimateRupees: option.codEstimateRupees,
      shippingDiscountPaise: option.shippingDiscountPaise,
      freeShippingPaise,
      codFeePaise: 0,
      subtotalPaise,
      discountPaise,
      amountPaise: subtotalPaise - discountPaise + option.chargePaise,
      expiresAt,
      codEligible,
      availableCodFeePaise,
      estimate: option.estimate,
      serviceability: "available",
    };
    sessionStorage.setItem(SHIPPING_SELECTION_KEY, JSON.stringify(selection));
    window.dispatchEvent(new Event("silkknot-shipping"));
  }, [options, selected, quoteId, expiresAt, codEligible, availableCodFeePaise, subtotalPaise, discountPaise, freeShippingPaise]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const option = options.find((item) => item.id === selected);
    if (!store.cart.length) {
      setError("Your bag is empty.");
      return;
    }
    if (!chosen || !addressReadyForDelivery(chosen) || !contact) {
      setError(chosen ? "This address is missing a phone, city, state, or PIN." : "Add a delivery address before continuing.");
      return;
    }
    if (!option || !quoteId) {
      setError("Choose an available shipping option before payment.");
      return;
    }
    const selection: ShippingSelection = {
      quoteId,
      optionId: option.id,
      label: option.label,
      chargePaise: option.chargePaise,
      prepaidChargePaise: option.chargePaise,
      codChargePaise: option.codChargePaise,
      estimateRupees: option.estimateRupees,
      codEstimateRupees: option.codEstimateRupees,
      shippingDiscountPaise: option.shippingDiscountPaise,
      freeShippingPaise,
      codFeePaise: 0,
      subtotalPaise,
      discountPaise,
      amountPaise: subtotalPaise - discountPaise + option.chargePaise,
      expiresAt,
      codEligible,
      availableCodFeePaise,
      estimate: option.estimate,
      serviceability: "available",
    };
    sessionStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify({ ...chosen, fullName: contact.name, email: contact.email, phone: chosen.phone || contact.phone }));
    sessionStorage.setItem(SHIPPING_SELECTION_KEY, JSON.stringify(selection));
    sessionStorage.setItem(PAYMENT_STORAGE_KEY, "razorpay");
    window.dispatchEvent(new Event("silkknot-shipping"));
    router.push("/checkout/review");
  }

  return (
    <CheckoutShell active={1} title="Where should we send it?" subtitle="Choose the address and how it should travel.">
      <div className="checkoutGrid">
        <section className="formCard">
          <form onSubmit={submit}>
            <div className="reviewBlock">
              <div className="reviewHeading">
                <h2>Delivery address</h2>
                <button type="button" onClick={() => router.push(addressPage)}>{chosen ? "Use a different address" : "Add an address"}</button>
              </div>
              {chosen ? (
                <div className="addressCard">
                  <MapPin size={18} aria-hidden />
                  <div>
                    <strong>{chosen.fullName}</strong>
                    <p>
                      {chosen.address1}{chosen.address2 ? `, ${chosen.address2}` : ""}
                      <br />
                      {chosen.city}, {chosen.state} {chosen.postalCode}
                      <br />
                      {chosen.country}
                    </p>
                    <p>{chosen.phone}</p>
                  </div>
                </div>
              ) : (
                <p>No default address yet. Add one to continue.</p>
              )}
            </div>
            <div className="reviewBlock">
              <div className="reviewHeading"><h2>Delivery</h2></div>
              {checking && !options.length ? (
                <p className="shipHint">Checking delivery for this address.</p>
              ) : (
                <p className={!checking && addressReady && !options.length ? "pinNotice" : "shipHint"}>{status}</p>
              )}
              <PinLookup />
              <div className={`paymentOptions${checking && options.length ? " isRefreshing" : ""}`} aria-busy={checking}>
                {checking && !options.length ? (
                  <>
                    <div className="shipSkeleton" />
                    <div className="shipSkeleton" />
                  </>
                ) : options.map((option) => (
                  <button type="button" key={option.id} onClick={() => setSelected(option.id)} className={`paymentOption shipChoice ${selected === option.id ? "selected" : ""}`}>
                    <span className="radioDot" />
                    <span className="paymentCopy">
                      <strong>{option.label}</strong>
                      <small>{option.detail}{option.estimate ? ` · ${option.estimate}` : ""}</small>
                    </span>
                    <span className={option.chargePaise === 0 ? "shipPrice free" : "shipPrice"}>
                      {option.chargePaise === 0 ? "Free" : formatPrice(option.chargePaise / 100)}
                    </span>
                  </button>
                ))}
              </div>
              {freeShippingPaise > 0 ? (
                <p className="shipHint">Free shipping on orders above {formatPrice(freeShippingPaise / 100)}.</p>
              ) : null}
            </div>
            {error ? <p className="errorText">{error}</p> : null}
            <div className="buttonRow">
              <button className="secondaryButton" type="button" onClick={() => router.push("/checkout")}><ArrowLeft size={16} /> Back</button>
              <button className="primaryButton" type="submit" disabled={!selected || checking}>
                Continue to review <ArrowRight size={17} />
              </button>
            </div>
            <p className="formFine">By continuing, you confirm that your delivery details are accurate.</p>
          </form>
        </section>
        <OrderSummary />
      </div>
    </CheckoutShell>
  );
}
