"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NumberFlow from "@number-flow/react";
import { ArrowDown, ChevronDown, Info, Percent } from "lucide-react";
import { FreeShippingProgress } from "@/components/cart/FreeShippingProgress";
import { ShippingFee } from "@/components/checkout/DeliveryChargeNote";
import { Media } from "@/components/ui";
import { CheckoutOfferSheet, OfferBox } from "@/components/offers/OfferBox";
import {
  IDEMPOTENCY_STORAGE_KEY,
  PAYMENT_STORAGE_KEY,
  SHIPPING_SELECTION_KEY,
  applyBagDiscount,
  assumedDeliveryPin,
  deliveryChargeSplit,
  estimateSelectionFromQuote,
  retainCheckoutDraft,
  shippingForPayment,
  type ShippingSelection,
} from "@/lib/checkout";
import {
  SHIPPING_QUOTE_EVENT,
  readShippingQuote,
  shippingQuoteCacheKey,
  shippingQuoteCartKey,
  type ShippingQuoteEventDetail,
} from "@/lib/checkout/shippingQuoteCache";
import { couponDiscount, couponDiscountPaise, discountPercent, formatPrice, subtotal } from "@/lib/format";
import { usePlatformFeeDisplay } from "@/lib/payments/platformFeeClient";
import { resolvePlatformFeeDisplay } from "@/lib/payments/platformFeeDisplay";
import { useShippingDisplay } from "@/lib/shipping/client";
import { useStore } from "@/lib/store";
import type { CartItem } from "@/lib/types";

type BillDiscount = { id: string; label: string; amount: number };

const TOTAL_FORMAT = {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
} as const;

const TOTAL_SPIN = { duration: 280, easing: "ease-out" } as const;

/** Digit-scroll checkout total (NumberFlow) when bag / fees / coupon change. */
function AnimatedTotal({ value }: { value: number }) {
  return (
    <strong>
      <NumberFlow
        value={Math.round(value)}
        locales="en-IN"
        format={TOTAL_FORMAT}
        transformTiming={TOTAL_SPIN}
        spinTiming={TOTAL_SPIN}
        opacityTiming={{ duration: 120, easing: "ease-out" }}
      />
    </strong>
  );
}

function lineOffer(item: CartItem) {
  const markedUnit = item.compareAtPrice && item.compareAtPrice > item.price ? item.compareAtPrice : item.price;
  const marked = markedUnit * item.quantity;
  const payable = item.price * item.quantity;
  return { marked, payable, offer: payable < marked };
}

function bagMrp(items: CartItem[]) {
  return items.reduce((sum, item) => {
    const unit = item.compareAtPrice && item.compareAtPrice > item.price ? item.compareAtPrice : item.price;
    return sum + unit * item.quantity;
  }, 0);
}

function DiscountLines({ lines }: { lines: BillDiscount[] }) {
  return (
    <>
      {lines.map((line) => (
        <div className="summaryLine billSave billDiscountRow" key={line.id}>
          <span>{line.label}</span>
          <span className="billMinus">−{formatPrice(line.amount)}</span>
        </div>
      ))}
    </>
  );
}

function BillDiscounts({ lines }: { lines: BillDiscount[] }) {
  const [open, setOpen] = useState(true);
  const panelId = useId();
  if (!lines.length) return null;

  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  if (lines.length === 1) {
    return (
      <div className="billDiscounts">
        <DiscountLines lines={lines} />
      </div>
    );
  }

  return (
    <div className="billDiscounts">
      <button
        type="button"
        className="summaryLine billDiscountToggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="billDiscountToggleLabel">
          Discounts
          <ChevronDown size={15} strokeWidth={2.2} className={open ? "isOpen" : undefined} aria-hidden />
        </span>
        <span className="billMinus">−{formatPrice(total)}</span>
      </button>
      {open ? (
        <div className="billDiscountPanel" id={panelId}>
          <DiscountLines lines={lines} />
        </div>
      ) : null}
    </div>
  );
}

function quoteMatchesBag(selection: ShippingSelection, goodsPaise: number) {
  return selection.subtotalPaise === goodsPaise;
}

function DeliveryThresholdNote({ freeAbovePaise }: { freeAbovePaise: number }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ left: 12, top: 12 });
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  const note = freeAbovePaise > 0
    ? `Heavier bags may cost more. Free above ${formatPrice(freeAbovePaise / 100)}.`
    : "Heavier bags may cost more.";

  useLayoutEffect(() => {
    if (!open) return;
    function placePanel() {
      const button = buttonRef.current;
      const panel = panelRef.current;
      if (!button || !panel) return;
      const rect = button.getBoundingClientRect();
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      let left = rect.left;
      if (left + width > window.innerWidth - 12) left = window.innerWidth - 12 - width;
      if (left < 12) left = 12;
      let top = rect.bottom + 8;
      if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 8);
      setPlace({ left, top });
    }
    placePanel();
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    return () => {
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className="chargeNote" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="chargeNoteButton"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="How delivery is priced"
        onClick={() => setOpen((current) => !current)}
      >
        <Info size={14} strokeWidth={1.8} />
      </button>
      {open ? (
        <span ref={panelRef} className="chargeNotePanel" id={panelId} role="note" style={{ left: place.left, top: place.top }}>
          <p style={{ margin: 0 }}>{note}</p>
        </span>
      ) : null}
    </span>
  );
}

function PlatformFeeNote({
  chargePaise,
  waiveAbovePaise,
  isFirstOrderWaiver,
}: {
  chargePaise: number;
  waiveAbovePaise: number;
  isFirstOrderWaiver: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ left: 12, top: 12 });
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  const show = chargePaise > 0 && !isFirstOrderWaiver && waiveAbovePaise > 0;

  useLayoutEffect(() => {
    if (!open) return;
    function placePanel() {
      const button = buttonRef.current;
      const panel = panelRef.current;
      if (!button || !panel) return;
      const rect = button.getBoundingClientRect();
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      let left = rect.left;
      if (left + width > window.innerWidth - 12) left = window.innerWidth - 12 - width;
      if (left < 12) left = 12;
      let top = rect.bottom + 8;
      if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 8);
      setPlace({ left, top });
    }
    placePanel();
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    return () => {
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!show) return null;

  return (
    <span className="chargeNote" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="chargeNoteButton"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Platform fee waiver"
        onClick={() => setOpen((current) => !current)}
      >
        <Info size={14} strokeWidth={1.8} />
      </button>
      {open ? (
        <span ref={panelRef} className="chargeNotePanel" id={panelId} role="note" style={{ left: place.left, top: place.top }}>
          <p style={{ margin: 0 }}>Waived on orders over {formatPrice(waiveAbovePaise / 100)}.</p>
        </span>
      ) : null}
    </span>
  );
}

function MrpNote({ items, mrp, selling }: { items: CartItem[]; mrp: number; selling: number }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ left: 12, top: 12 });
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    function placePanel() {
      const button = buttonRef.current;
      const panel = panelRef.current;
      if (!button || !panel) return;
      const rect = button.getBoundingClientRect();
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      let left = rect.left;
      if (left + width > window.innerWidth - 12) left = window.innerWidth - 12 - width;
      if (left < 12) left = 12;
      let top = rect.bottom + 8;
      if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 8);
      setPlace({ left, top });
    }
    placePanel();
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    return () => {
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
    };
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className="chargeNote" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="chargeNoteButton"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="How selling price adds up"
        onClick={() => setOpen((current) => !current)}
      >
        <Info size={14} strokeWidth={1.8} />
      </button>
      {open ? (
        <span ref={panelRef} className="chargeNotePanel subtotalNote" id={panelId} role="note" style={{ left: place.left, top: place.top }}>
          {items.map((item) => {
            const offerLine = item.price * item.quantity;
            const original = item.compareAtPrice && item.compareAtPrice > item.price
              ? item.compareAtPrice * item.quantity
              : offerLine;
            return (
              <span className="chargeRow" key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  {item.variantLabel} · Qty {item.quantity}
                </span>
                <span className="chargeFee">
                  <b>{formatPrice(original)}</b>
                </span>
              </span>
            );
          })}
          <p>Selling price is the original price of your items, including taxes. Discounts below bring this down before shipping.</p>
          <span className="chargeRow chargeRowTotal">
            <span>Selling price</span>
            <span>{formatPrice(mrp)}</span>
          </span>
          {mrp > selling ? (
            <span className="chargeRow chargeRowTotal">
              <span>After product discount</span>
              <span>{formatPrice(selling)}</span>
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export default function OrderSummary() {
  const store = useStore();
  const pathname = usePathname();
  const shippingDisplay = useShippingDisplay();
  const platformDisplay = usePlatformFeeDisplay();
  const [offersOpen, setOffersOpen] = useState(false);
  const [selection, setSelection] = useState<ShippingSelection | null>(null);
  const [estimate, setEstimate] = useState<ShippingSelection | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [payCod, setPayCod] = useState(false);
  const [couponNotice, setCouponNotice] = useState("");
  const seenDiscount = useRef<number | null>(null);
  const items = store.cart;
  const goods = subtotal(items);
  const goodsPaise = Math.round(goods * 100);
  const coupon = store.coupons.find((item) => item.code === store.couponCode && item.active);
  const discountPaise = coupon ? couponDiscountPaise(items, coupon) : 0;
  const discount = discountPaise / 100;
  const mrp = bagMrp(items);
  const mrpDiscount = Math.max(0, mrp - goods);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const bagKey = items.map((item) => `${item.productId}:${item.variantLabel}:${item.quantity}:${item.price}`).join("|");
  const [postal, setPostal] = useState("");
  const hasPin = /^\d{6}$/.test(postal);
  const confirmed = Boolean(selection && items.length && quoteMatchesBag(selection, goodsPaise));

  useEffect(() => {
    if (!store.ready) return;
    setPostal(assumedDeliveryPin(store.currentUser));
  }, [store.ready, store.currentUser]);

  useEffect(() => {
    if (!store.ready || !store.couponCode) return;
    // Keep a claimed code while the bag is empty (welcome scratch / early claim).
    if (!items.length) return;
    const applied = store.coupons.find((item) => item.active && item.code === store.couponCode);
    if (applied && couponDiscount(items, applied) > 0) return;
    const code = store.couponCode;
    store.clearCoupon();
    setCouponNotice(`${code} no longer applies to the items in your bag, so it was removed.`);
  }, [store.ready, store.couponCode, store.coupons, store.clearCoupon, items, bagKey]);

  useEffect(() => {
    if (!store.ready) return;
    retainCheckoutDraft(store.currentUser?.id ?? null);
    const pin = assumedDeliveryPin(store.currentUser);
    setPostal(pin);

    const readSelection = () => {
      try {
        const raw = sessionStorage.getItem(SHIPPING_SELECTION_KEY);
        const parsed = raw ? JSON.parse(raw) as ShippingSelection : null;
        if (parsed && !quoteMatchesBag(parsed, goodsPaise)) {
          sessionStorage.removeItem(SHIPPING_SELECTION_KEY);
          setSelection(null);
          setPayCod(false);
          return;
        }
        const applyCod = pathname === "/checkout/review" && sessionStorage.getItem(PAYMENT_STORAGE_KEY) === "cod";
        setPayCod(applyCod);
        setSelection(parsed ? shippingForPayment(parsed, "razorpay") : null);
      } catch {
        setSelection(null);
      }
    };
    const readEstimate = (statusHint?: ShippingQuoteEventDetail["status"]) => {
      const nextPin = assumedDeliveryPin(store.currentUser);
      setPostal(nextPin);
      if (!items.length || !/^\d{6}$/.test(nextPin)) {
        setEstimate(null);
        setQuoteStatus("idle");
        return;
      }
      const cacheKey = shippingQuoteCacheKey(
        nextPin,
        shippingQuoteCartKey(items.map((item) => ({
          productId: item.productId,
          variantLabel: item.variantLabel,
          quantity: item.quantity,
        }))),
        store.couponCode,
      );
      const body = readShippingQuote(cacheKey);
      if (body) {
        setEstimate(estimateSelectionFromQuote(body, goodsPaise, discountPaise));
        setQuoteStatus("ready");
        return;
      }
      setEstimate(null);
      // Never flip idle/ready back to loading here — only quote events start loading.
      if (statusHint === "loading") setQuoteStatus("loading");
      else if (statusHint === "idle") setQuoteStatus("idle");
      else setQuoteStatus((prev) => (prev === "loading" ? "loading" : "idle"));
    };
    const readAll = () => {
      readSelection();
      readEstimate();
    };
    const onQuote = (event: Event) => {
      const detail = (event as CustomEvent<ShippingQuoteEventDetail>).detail;
      const nextPin = assumedDeliveryPin(store.currentUser);
      if (!/^\d{6}$/.test(nextPin)) {
        setPostal("");
        setEstimate(null);
        setQuoteStatus("idle");
        return;
      }
      if (detail?.status) setQuoteStatus(detail.status);
      readEstimate(detail?.status);
    };
    readAll();
    window.addEventListener("silkknot-shipping", readAll);
    window.addEventListener(SHIPPING_QUOTE_EVENT, onQuote);
    return () => {
      window.removeEventListener("silkknot-shipping", readAll);
      window.removeEventListener(SHIPPING_QUOTE_EVENT, onQuote);
    };
  }, [store.ready, store.currentUser, store.couponCode, pathname, bagKey, goodsPaise, discountPaise, items]);

  useEffect(() => {
    if (seenDiscount.current === null) {
      seenDiscount.current = discount;
      return;
    }
    if (seenDiscount.current === discount) return;
    seenDiscount.current = discount;
    sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
  }, [discount]);

  const server = confirmed
    ? selection
    : estimate && items.length && quoteMatchesBag(estimate, goodsPaise)
      ? estimate
      : null;
  const priced = server ? applyBagDiscount(server, discountPaise, payCod ? "cod" : "razorpay", goodsPaise) : null;
  const deliveryLoading = hasPin && !priced && quoteStatus === "loading";

  const charges = priced ? deliveryChargeSplit(priced) : null;
  const merchandise = Math.max(0, (goodsPaise - discountPaise) / 100);
  const netPaise = goodsPaise - discountPaise;
  const localPlatform = resolvePlatformFeeDisplay(platformDisplay, netPaise);
  const platformListPaise = priced?.platformFeeListPaise ?? localPlatform.listPaise;
  const platformChargePaise = priced?.platformFeePaise ?? localPlatform.chargePaise;
  const platformWaiveAbovePaise = priced?.platformFeeWaiveAbovePaise ?? platformDisplay.waiveAbovePaise;
  const platformWaiveFirstOrder = priced
    ? Boolean(priced.platformFeeWaiveFirstOrder)
    : localPlatform.reason === "first_order";
  const threshold = priced?.freeShippingPaise ?? shippingDisplay.freeShippingPaise;
  const shortfallPaise = threshold > 0 && netPaise < threshold ? threshold - netPaise : 0;
  // Contact page (saved PIN, quote may lag): standard prepaid estimate from policy.
  const estimateFree = hasPin && threshold > 0 && netPaise >= threshold && !payCod;
  const estimatePaise = estimateFree ? 0 : shippingDisplay.standardPaise;
  const deliveryFree = charges ? charges.shippingFree : estimateFree;
  const deliveryPaise = charges ? charges.shippingPaise : estimatePaise;
  const shippingInTotal = hasPin || charges
    ? (deliveryFree ? 0 : deliveryPaise / 100)
    : 0;
  const total = priced
    ? priced.amountPaise / 100
    : merchandise + platformChargePaise / 100 + shippingInTotal;
  const platformSaved = platformListPaise > 0 && platformChargePaise === 0 ? platformListPaise / 100 : 0;
  const saved = mrpDiscount + discount + platformSaved;
  const standardPath = !priced || priced.optionId === "standard";
  const freeDeliveryHint = Boolean(
    hasPin
    && !deliveryFree
    && standardPath
    && shortfallPaise > 0
    && !payCod
    && !deliveryLoading,
  );
  const deliveryFeeHint = (() => {
    if (!hasPin || deliveryLoading) return null;
    if (deliveryFree) {
      if (threshold > 0) return `Waived on orders over ${formatPrice(threshold / 100)}`;
      return "Waived on this order";
    }
    // Parenthetical freeDeliveryHint covers standard prepaid shortfall.
    if (freeDeliveryHint) return null;
    if (payCod && threshold > 0) {
      return shortfallPaise > 0
        ? `Add ${formatPrice(shortfallPaise / 100)} more and pay online to waive delivery`
        : "Pay online to waive delivery on this bag";
    }
    if (priced && priced.optionId !== "standard" && threshold > 0) {
      return `Choose standard delivery for free delivery over ${formatPrice(threshold / 100)}`;
    }
    if (shortfallPaise > 0) return `Add ${formatPrice(shortfallPaise / 100)} more for free delivery`;
    return null;
  })();
  const platformFeeHint = (() => {
    if (platformListPaise <= 0) return null;
    if (platformChargePaise > 0) {
      if (platformWaiveAbovePaise > 0) {
        return `Waived on orders over ${formatPrice(platformWaiveAbovePaise / 100)}`;
      }
      return null;
    }
    if (platformWaiveFirstOrder) return "Waived on your first order";
    if (platformWaiveAbovePaise > 0) return `Waived on orders over ${formatPrice(platformWaiveAbovePaise / 100)}`;
    return null;
  })();
  const discountLines: BillDiscount[] = [];
  if (mrpDiscount > 0) {
    discountLines.push({ id: "mrp", label: "Discount on selling price", amount: mrpDiscount });
  }
  if (coupon && discount > 0) {
    discountLines.push({
      id: "coupon",
      label: coupon.code ? `Coupon applied (${coupon.code})` : "Coupon applied",
      amount: discount,
    });
  }

  function changeQuantity(lineId: string, next: number) {
    sessionStorage.removeItem(SHIPPING_SELECTION_KEY);
    window.dispatchEvent(new Event("silkknot-shipping"));
    store.setQuantity(lineId, next);
  }

  function deliveryAmount() {
    if (!hasPin) {
      return <span className="billPending">Shown on delivery step</span>;
    }
    // Saved PIN: quote when ready, else standard fee / free from policy (contact page).
    return <ShippingFee amountPaise={deliveryPaise} free={deliveryFree} />;
  }

  function platformAmount() {
    if (platformListPaise > 0) {
      return <ShippingFee amountPaise={platformListPaise} free={platformChargePaise === 0} />;
    }
    return <span className="chargeFree">Free</span>;
  }

  return (
    <aside className="summary">
      <div className="summaryHeading">
        <h2>Your order</h2>
        <span>{count} {count === 1 ? "item" : "items"}</span>
      </div>
      {items.length ? (
        <div className="summaryItems">
          {items.map((item) => {
            const prices = lineOffer(item);
            const off = discountPercent(item.price, item.compareAtPrice);
            const product = store.products.find((entry) => entry.id === item.productId);
            const stock = product?.variants.find((variant) => variant.label === item.variantLabel)?.stock ?? 20;
            return (
              <div className="summaryItem" key={item.id}>
                <Link href={`/products/${item.slug}`} className="summaryLink">
                  <div className="summaryThumb">
                    <Media src={item.image} alt="" sizes="60px" className="object-cover" />
                  </div>
                  <div className="summaryProduct">
                    <strong>{item.name}</strong>
                    <small>{item.variantLabel}</small>
                  </div>
                </Link>
                <div className="summaryAside">
                  <div className="qtyStepper">
                    <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => changeQuantity(item.id, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button type="button" aria-label={`Increase ${item.name}`} disabled={item.quantity >= stock} onClick={() => changeQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                  <span className="itemPrice">
                    {off > 0 ? (
                      <span className="itemOff" aria-label={`${off}% off`}>
                        <ArrowDown size={12} strokeWidth={2.5} aria-hidden />
                        {off}%
                      </span>
                    ) : null}
                    {prices.offer ? <s>{formatPrice(prices.marked)}</s> : null}
                    <b className={prices.offer ? "offerPrice" : ""}>{formatPrice(prices.payable)}</b>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="summaryFoot">Your bag is empty.</p>
      )}
      {items.length ? (
        <FreeShippingProgress
          amount={merchandise}
          threshold={(priced?.freeShippingPaise ?? shippingDisplay.freeShippingPaise) / 100}
          className="mb-3"
        />
      ) : null}
      {items.length ? <div className="mb-3"><OfferBox onOpenAll={() => setOffersOpen(true)} /></div> : null}
      {couponNotice ? <p className="couponNotice" role="status">{couponNotice}</p> : null}
      <CheckoutOfferSheet open={offersOpen} onClose={() => setOffersOpen(false)} />
      <div className="billSummary">
        <h3 className="billTitle">Price details</h3>
        <div className="summaryLine">
          <span className="summaryWithNote">
            <span className="billLabel">
              Selling price <span className="billHint">(incl. of all taxes)</span>
            </span>
            {items.length ? <MrpNote items={items} mrp={mrp} selling={goods} /> : null}
          </span>
          <span>{formatPrice(mrp || goods)}</span>
        </div>
        <BillDiscounts lines={discountLines} />
        <div className="billRule" />
        {items.length ? (
          <div className="summaryLine billBagTotal">
            <span className="billLabel">
              Bag total <span className="billHint">(after offers)</span>
            </span>
            <span>{formatPrice(merchandise)}</span>
          </div>
        ) : null}
        <div className={`summaryLine billDelivery${freeDeliveryHint ? " hasHint" : ""}`}>
          <span className="summaryWithNote">
            <span className="billLabel">Shipping fee</span>
            {items.length ? <DeliveryThresholdNote freeAbovePaise={threshold} /> : null}
          </span>
          <span className="billAmountBlock">
            {deliveryAmount()}
            {deliveryFeeHint ? <span className="billAmountNote">{deliveryFeeHint}</span> : null}
          </span>
          {freeDeliveryHint ? (
            <span className="billFreeHint">(Add {formatPrice(shortfallPaise / 100)} for free delivery)</span>
          ) : null}
        </div>
        <div className="summaryLine billPlatform">
          <span className="summaryWithNote">
            <span className="billLabel">Platform fee</span>
            {platformListPaise > 0 ? (
              <PlatformFeeNote
                chargePaise={platformChargePaise}
                waiveAbovePaise={platformWaiveAbovePaise}
                isFirstOrderWaiver={platformWaiveFirstOrder}
              />
            ) : null}
          </span>
          <span className="billAmountBlock">
            {platformAmount()}
            {platformFeeHint ? <span className="billAmountNote">{platformFeeHint}</span> : null}
          </span>
        </div>
        {charges && charges.codPaise > 0 ? (
          <div className="summaryLine">
            <span>COD charges</span>
            <span>{formatPrice(charges.codPaise / 100)}</span>
          </div>
        ) : null}
        {priced && priced.codFeePaise > 0 && !(charges && charges.codPaise > 0) ? (
          <div className="summaryLine">
            <span>Cash on delivery fee</span>
            <span>{formatPrice(priced.codFeePaise / 100)}</span>
          </div>
        ) : null}
        <div className="summaryTotal">
          <span>You pay</span>
          <AnimatedTotal value={total} />
        </div>
        {items.length && saved > 0 ? (
          <p className="billSaved">
            <span className="bg-green-800 text-white p-[5px] rounded-full">
              <Percent size={14} strokeWidth={2.2} aria-hidden />
            </span>
            <span>You&apos;ll save <strong>{formatPrice(saved)}</strong> on this order</span>
          </p>
        ) : items.length && !hasPin ? (
          <p className="summaryFoot">Delivery charge appears after you add an address.</p>
        ) : items.length && hasPin && deliveryFree ? (
          <p className="summaryFoot">Free delivery unlocked — no delivery charge on this bag.</p>
        ) : items.length && hasPin && payCod && threshold > 0 && shortfallPaise <= 0 ? (
          <p className="summaryFoot">Pay online to waive delivery on this bag.</p>
        ) : null}
      </div>
    </aside>
  );
}
