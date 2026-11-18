"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Leaf, Pencil, Phone, Plus, Truck } from "lucide-react";
import CheckoutShell from "@/components/checkout/CheckoutShell";
import OrderSummary from "@/components/checkout/OrderSummary";
import { BrandPin } from "@/components/icons/BrandPin";
import {
  ADDRESS_STORAGE_KEY,
  assumedAccountAddress,
  CONTACT_STORAGE_KEY,
  PAYMENT_STORAGE_KEY,
  readSessionDeliveryAddress,
  SHIPPING_SELECTION_KEY,
  retainCheckoutDraft,
  type CheckoutContact,
  type ShippingAddress,
  type ShippingSelection,
} from "@/lib/checkout";
import {
  cartItemsFromKey,
  prefetchShippingQuote,
  readShippingQuote,
  shippingQuoteCacheKey,
  writeShippingQuote,
  type ShippingQuoteBody,
} from "@/lib/checkout/shippingQuoteCache";
import { PinLookup } from "@/components/product/DeliveryChoice";
import { formatPrice } from "@/lib/format";
import { unavailablePinMessage } from "@/lib/shipping/estimate";
import { useStore } from "@/lib/store";
import type { Address, User } from "@/lib/types";

type SavedChoice = ShippingAddress & { id: string; label: string };

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
  const [platformFeePaise, setPlatformFeePaise] = useState(0);
  const [platformFeeListPaise, setPlatformFeeListPaise] = useState(0);
  const [platformFeeWaiveAbovePaise, setPlatformFeeWaiveAbovePaise] = useState(0);
  const [platformFeeWaiveFirstOrder, setPlatformFeeWaiveFirstOrder] = useState(false);
  const [platformFeeFirstOrderEnabled, setPlatformFeeFirstOrderEnabled] = useState(false);
  const [couponNotice, setCouponNotice] = useState("");
  const [selected, setSelected] = useState<"standard" | "express" | "">("");
  const [checking, setChecking] = useState(false);
  const [contact, setContact] = useState<CheckoutContact | null>(null);
  const [sessionAddress, setSessionAddress] = useState<ShippingAddress | null>(null);
  const chosen = useMemo<SavedChoice | null>(() => {
    if (!user) return null;
    if (sessionAddress && /^\d{6}$/.test(sessionAddress.postalCode.trim())) {
      return {
        id: "session",
        label: "Previous delivery",
        fullName: sessionAddress.fullName || user.name || "",
        email: sessionAddress.email || user.email || "",
        phone: sessionAddress.phone || user.phone || "",
        address1: sessionAddress.address1,
        address2: sessionAddress.address2 || "",
        city: sessionAddress.city || "",
        postalCode: sessionAddress.postalCode || "",
        country: sessionAddress.country || "India",
      };
    }
    const home = assumedAccountAddress(user) ?? user.addresses.find((item) => item.line1) ?? null;
    return home ? toChoice(home, user) : null;
  }, [user, sessionAddress]);
  const addressPage = "/account/addresses?next=/checkout/shipping";
  const pin = chosen?.postalCode || "";
  const addressReady = Boolean(chosen && addressReadyForDelivery(chosen));
  const hasAddress = Boolean(chosen);
  const cartKey = store.cart.map((item) => `${item.productId}:${item.variantLabel}:${item.quantity}`).join("|");

  useEffect(() => {
    if (!store.ready) return;
    retainCheckoutDraft(user?.id ?? null);
    setSessionAddress(readSessionDeliveryAddress());
    const saved = readContact();
    if (!saved) {
      router.replace("/checkout");
      return;
    }
    setContact(saved);
  }, [router, store.ready, user?.id]);

  function applyQuote(body: ShippingQuoteBody, forPin: string) {
    if (body.couponRemoved) {
      store.clearCoupon();
      setCouponNotice(typeof body.couponNotice === "string" && body.couponNotice
        ? body.couponNotice
        : "That offer no longer applies to the items in your bag, so it was removed.");
    } else {
      setCouponNotice("");
    }
    if (!body.quoteId) {
      setOptions([]);
      setQuoteId("");
      setSelected("");
      if (body.code === "temporary") setStatus("Delivery could not be checked. Try again.");
      else if (typeof body.error === "string" && /offer|coupon/i.test(body.error)) setStatus(body.error);
      else setStatus(unavailablePinMessage(forPin, "address"));
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
    setPlatformFeePaise(body.platformFeePaise || 0);
    setPlatformFeeListPaise(body.platformFeeListPaise || 0);
    setPlatformFeeWaiveAbovePaise(body.platformFeeWaiveAbovePaise || 0);
    setPlatformFeeWaiveFirstOrder(Boolean(body.platformFeeWaiveFirstOrder));
    setPlatformFeeFirstOrderEnabled(Boolean(body.platformFeeFirstOrderEnabled));
    setStatus(next.length ? "Delivery is available." : unavailablePinMessage(forPin, "address"));
    setSelected((current) => (next.some((option) => option.id === current) ? current : next[0]?.id || ""));
  }

  useEffect(() => {
    if (!addressReady || !cartKey || !/^\d{6}$/.test(pin)) {
      setChecking(false);
      setOptions([]);
      setQuoteId("");
      setSelected("");
      setStatus(hasAddress ? "This address needs a name, phone, street, city, and 6-digit PIN." : "Add an address to check delivery.");
      return;
    }
    const cacheKey = shippingQuoteCacheKey(pin, cartKey, store.couponCode);
    const cached = readShippingQuote(cacheKey);
    if (cached) {
      setChecking(false);
      setError("");
      applyQuote(cached, pin);
      return;
    }
    const controller = new AbortController();
    setChecking(true);
    setError("");
    void (async () => {
      try {
        const body = await prefetchShippingQuote({
          postalCode: pin,
          couponCode: store.couponCode,
          items: cartItemsFromKey(cartKey),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!body) {
          setOptions([]);
          setQuoteId("");
          setSelected("");
          setCouponNotice("");
          setStatus("Delivery could not be checked. Try again.");
          return;
        }
        if (body.quoteId) writeShippingQuote(cacheKey, body);
        applyQuote(body, pin);
      } catch (failure) {
        if ((failure as { name?: string }).name === "AbortError" || controller.signal.aborted) return;
        setOptions([]);
        setQuoteId("");
        setSelected("");
        setCouponNotice("");
        setStatus("Delivery could not be checked. Try again.");
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    })();
    return () => controller.abort();
  }, [pin, store.couponCode, store.clearCoupon, cartKey, addressReady, hasAddress]);

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
      platformFeeListPaise,
      platformFeePaise,
      platformFeeWaiveAbovePaise,
      platformFeeWaiveFirstOrder,
      platformFeeFirstOrderEnabled,
      codFeePaise: 0,
      subtotalPaise,
      discountPaise,
      amountPaise: subtotalPaise - discountPaise + option.chargePaise + platformFeePaise,
      expiresAt,
      codEligible,
      availableCodFeePaise,
      estimate: option.estimate,
      serviceability: "available",
    };
    sessionStorage.setItem(SHIPPING_SELECTION_KEY, JSON.stringify(selection));
    window.dispatchEvent(new Event("silkknot-shipping"));
  }, [options, selected, quoteId, expiresAt, codEligible, availableCodFeePaise, subtotalPaise, discountPaise, freeShippingPaise, platformFeePaise, platformFeeListPaise, platformFeeWaiveAbovePaise, platformFeeWaiveFirstOrder, platformFeeFirstOrderEnabled]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const option = options.find((item) => item.id === selected);
    if (!store.cart.length) {
      setError("Your bag is empty.");
      return;
    }
    if (!chosen || !addressReadyForDelivery(chosen) || !contact) {
      setError(chosen ? "This address is missing a phone, city, or PIN." : "Add a delivery address before continuing.");
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
      platformFeeListPaise,
      platformFeePaise,
      platformFeeWaiveAbovePaise,
      platformFeeWaiveFirstOrder,
      platformFeeFirstOrderEnabled,
      codFeePaise: 0,
      subtotalPaise,
      discountPaise,
      amountPaise: subtotalPaise - discountPaise + option.chargePaise + platformFeePaise,
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
    <CheckoutShell active={1} title="Where should we send it?" subtitle="Choose your address and how it should travel.">
      <div className="checkoutGrid">
        <section className="formCard">
          <form onSubmit={submit}>
            <div className="reviewBlock">
              {chosen ? (
                <>
                  <div className="reviewHeading">
                    <div className="shipSectionHead">
                      <span className="shipSectionIcon" aria-hidden>
                        <BrandPin size={18} />
                      </span>
                      <h2>Delivery Address</h2>
                    </div>
                    <div className="addressActions">
                      <button type="button" onClick={() => router.push(addressPage)}>
                        <Pencil size={14} strokeWidth={2} aria-hidden />
                        Change address
                      </button>
                    </div>
                  </div>
                  <div className="addressCard">
                    <span className="addressCheck" aria-hidden>
                      <Check size={14} strokeWidth={2.5} />
                    </span>
                    <div className="addressCardBody">
                      <strong>{chosen.fullName}</strong>
                      <p>
                        {[
                          [chosen.address1, chosen.address2].filter(Boolean).join(", "),
                          [chosen.city, chosen.postalCode].filter(Boolean).join(" "),
                          chosen.country,
                        ].filter(Boolean).join(" • ")}
                      </p>
                      {chosen.phone ? (
                        <p className="addressPhone">
                          <Phone size={13} strokeWidth={0} fill="currentColor" aria-hidden />
                          <span>{chosen.phone}</span>
                        </p>
                      ) : null}
                    </div>
                    <Leaf className="addressCardLeaf" size={72} strokeWidth={1} aria-hidden />
                  </div>
                </>
              ) : (
                <>
                  <div className="reviewHeading">
                    <div className="shipSectionHead">
                      <span className="shipSectionIcon" aria-hidden>
                        <BrandPin size={18} />
                      </span>
                      <h2>Delivery Address</h2>
                    </div>
                  </div>
                  <div className="addressEmpty">
                    <span className="addressEmptyIcon" aria-hidden>
                      <Leaf className="addressLeaf addressLeafLeft" size={14} />
                      <BrandPin size={28} />
                      <Leaf className="addressLeaf addressLeafRight" size={14} />
                    </span>
                    <strong>Your first address starts here</strong>
                    <p>Add an address to check delivery and continue securely.</p>
                    <button type="button" className="addressEmptyCta" onClick={() => router.push(addressPage)}>
                      <Plus size={18} aria-hidden />
                      Add delivery address
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="reviewBlock">
              <PinLookup initialPin={pin} />
              {couponNotice ? <p className="couponNotice" role="status">{couponNotice}</p> : null}
            </div>
            {hasAddress ? (
              <div className="reviewBlock">
                <div className="reviewHeading">
                  <div className="shipSectionHead">
                    <span className="shipSectionIcon" aria-hidden>
                      <Truck size={20} strokeWidth={2} />
                    </span>
                    <h2>Choose Delivery Method</h2>
                  </div>
                  {options.length > 0 ? (
                    <span className="shipOptionCount">{options.length} options</span>
                  ) : null}
                </div>
                {checking && !options.length ? (
                  <p className="shipHint">Checking delivery for this address.</p>
                ) : !checking && addressReady && !options.length ? (
                  <p className="pinNotice">{status}</p>
                ) : null}
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
                        <small className="shipEta">
                          <CalendarDays size={13} strokeWidth={2} aria-hidden />
                          <span>{option.estimate || option.detail}</span>
                        </small>
                      </span>
                      <span className={option.chargePaise === 0 ? "shipPrice free" : "shipPrice"}>
                        {option.chargePaise === 0 ? "Free" : formatPrice(option.chargePaise / 100)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {freeShippingPaise > 0 ? (
              <p className="shipPromo">
                <Truck size={16} strokeWidth={2} aria-hidden />
                <span>Free shipping on orders above {formatPrice(freeShippingPaise / 100)}</span>
              </p>
            ) : null}
            {error ? <p className="errorText">{error}</p> : null}
            <div className="buttonRow shipNavRow">
              <button className="textBackButton" type="button" onClick={() => router.push("/checkout")}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="primaryButton" type="submit" disabled={!selected || checking}>
                Continue to review <ArrowRight size={17} />
              </button>
            </div>
          </form>
        </section>
        <OrderSummary />
      </div>
    </CheckoutShell>
  );
}
