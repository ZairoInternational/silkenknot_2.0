"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Info, Percent } from "lucide-react";
import { DeliveryChargeNote, ShippingFee } from "@/components/checkout/DeliveryChargeNote";
import { Media } from "@/components/ui";
import { CheckoutOfferSheet, OfferBox } from "@/components/offers/OfferBox";
import { IDEMPOTENCY_STORAGE_KEY, PAYMENT_STORAGE_KEY, SHIPPING_SELECTION_KEY, applyBagDiscount, deliveryChargeSplit, retainCheckoutDraft, shippingForPayment, type ShippingSelection } from "@/lib/checkout";
import { couponDiscount, couponDiscountPaise, formatPrice, subtotal } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { CartItem } from "@/lib/types";

type BillDiscount = { id: string; label: string; amount: number };

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
        aria-label="How MRP adds up"
        onClick={() => setOpen((current) => !current)}
      >
        <Info size={14} strokeWidth={1.8} />
      </button>
      {open ? (
        <span ref={panelRef} className="chargeNotePanel subtotalNote" id={panelId} role="note" style={{ left: place.left, top: place.top }}>
          {items.map((item) => {
            const sellingLine = item.price * item.quantity;
            const marked = item.compareAtPrice && item.compareAtPrice > item.price ? item.compareAtPrice * item.quantity : sellingLine;
            return (
              <span className="chargeRow" key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  {item.variantLabel} · Qty {item.quantity}
                </span>
                <span className="chargeFee">
                  {marked > sellingLine ? <s>{formatPrice(marked)}</s> : null}
                  <b className={marked > sellingLine ? "offerPrice" : ""}>{formatPrice(sellingLine)}</b>
                </span>
              </span>
            );
          })}
          <p>MRP is the marked price including taxes. A crossed-out figure is the earlier MRP; the amount below it is what you pay before coupons and delivery.</p>
          <span className="chargeRow chargeRowTotal">
            <span>MRP</span>
            <span>{formatPrice(mrp)}</span>
          </span>
          {mrp > selling ? (
            <span className="chargeRow chargeRowTotal">
              <span>Selling price</span>
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
  const [offersOpen, setOffersOpen] = useState(false);
  const [selection, setSelection] = useState<ShippingSelection | null>(null);
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

  useEffect(() => {
    if (!store.ready || !store.couponCode) return;
    if (items.length) {
      const applied = store.coupons.find((item) => item.active && item.code === store.couponCode);
      if (applied && couponDiscount(items, applied) > 0) return;
    }
    const code = store.couponCode;
    store.clearCoupon();
    setCouponNotice(`${code} no longer applies to the items in your bag, so it was removed.`);
  }, [store.ready, store.couponCode, store.coupons, store.clearCoupon, items, bagKey]);

  useEffect(() => {
    if (!store.ready) return;
    retainCheckoutDraft(store.currentUser?.id ?? null);
    const read = () => {
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
    read();
    window.addEventListener("silkknot-shipping", read);
    return () => window.removeEventListener("silkknot-shipping", read);
  }, [store.ready, store.currentUser?.id, pathname, bagKey, goodsPaise]);

  useEffect(() => {
    if (seenDiscount.current === null) {
      seenDiscount.current = discount;
      return;
    }
    if (seenDiscount.current === discount) return;
    seenDiscount.current = discount;
    sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
  }, [discount]);

  const server = selection && items.length && quoteMatchesBag(selection, goodsPaise) ? selection : null;
  const priced = server ? applyBagDiscount(server, discountPaise, payCod ? "cod" : "razorpay", goodsPaise) : null;

  const charges = priced ? deliveryChargeSplit(priced) : null;
  const merchandise = Math.max(0, (goodsPaise - discountPaise) / 100);
  const total = priced ? priced.amountPaise / 100 : merchandise;
  const platformListPaise = priced?.platformFeeListPaise ?? 0;
  const platformChargePaise = priced?.platformFeePaise ?? 0;
  const platformSaved = platformListPaise > 0 && platformChargePaise === 0 ? platformListPaise / 100 : 0;
  const saved = mrpDiscount + discount + platformSaved;
  const threshold = priced?.freeShippingPaise ?? 0;
  const netPaise = goodsPaise - discountPaise;
  const shortfallPaise = threshold > 0 && netPaise < threshold ? threshold - netPaise : 0;
  const freeDeliveryHint = Boolean(
    priced
    && charges
    && !charges.shippingFree
    && priced.optionId === "standard"
    && shortfallPaise > 0
    && !payCod,
  );
  const platformWaiveAbovePaise = priced?.platformFeeWaiveAbovePaise ?? 0;
  const platformFeeHint = (() => {
    if (!priced || platformListPaise <= 0 || platformChargePaise > 0) return null;
    if (priced.platformFeeWaiveFirstOrder) return "Waived on your first order";
    if (platformWaiveAbovePaise > 0) return `Waived on orders over ${formatPrice(platformWaiveAbovePaise / 100)}`;
    return null;
  })();
  const discountLines: BillDiscount[] = [];
  if (mrpDiscount > 0) discountLines.push({ id: "mrp", label: "Discount on MRP", amount: mrpDiscount });
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
      {items.length ? <div className="mb-4"><OfferBox onOpenAll={() => setOffersOpen(true)} /></div> : null}
      {couponNotice ? <p className="couponNotice" role="status">{couponNotice}</p> : null}
      <CheckoutOfferSheet open={offersOpen} onClose={() => setOffersOpen(false)} />
      <div className="billSummary">
        <h3 className="billTitle">Price details</h3>
        <div className="summaryLine">
          <span className="summaryWithNote">
            <span className="billLabel">MRP <span className="billHint">(incl. of all taxes)</span></span>
            {items.length ? <MrpNote items={items} mrp={mrp} selling={goods} /> : null}
          </span>
          <span>{formatPrice(mrp || goods)}</span>
        </div>
        <div className={`summaryLine billDelivery${freeDeliveryHint ? " hasHint" : ""}`}>
          <span className="summaryWithNote">
            <span className="billLabel">Delivery charges</span>
            {priced ? <DeliveryChargeNote selection={priced} /> : null}
          </span>
          <span>
            {charges ? (
              <ShippingFee amountPaise={charges.shippingPaise} free={charges.shippingFree} />
            ) : (
              <span className="billPending">Added at shipping</span>
            )}
          </span>
          {freeDeliveryHint ? (
            <span className="billFreeHint">(Add {formatPrice(shortfallPaise / 100)} for free delivery)</span>
          ) : null}
        </div>
        <div className="summaryLine billPlatform">
          <span className="summaryWithNote">
            <span className="billLabel">Platform fee</span>
            {priced ? (
              <PlatformFeeNote
                chargePaise={platformChargePaise}
                waiveAbovePaise={platformWaiveAbovePaise}
                isFirstOrderWaiver={Boolean(priced.platformFeeWaiveFirstOrder)}
              />
            ) : null}
          </span>
          <span className="billAmountBlock">
            {priced && platformListPaise > 0 ? (
              <ShippingFee amountPaise={platformListPaise} free={platformChargePaise === 0} />
            ) : priced ? (
              <span className="chargeFree">Free</span>
            ) : (
              <span className="billPending">Added at shipping</span>
            )}
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
        {discountLines.length ? <div className="billRule billRuleDashed" /> : null}
        <BillDiscounts lines={discountLines} />
        <div className="summaryTotal">
          <span>Total amount</span>
          <strong>{formatPrice(total)}</strong>
        </div>
        {items.length && saved > 0 ? (
          <p className="billSaved">
            <span className="bg-green-800 text-white p-[5px] rounded-full">
            <Percent size={14} strokeWidth={2.2} aria-hidden />
            </span>
            <span>You&apos;ll save <strong>{formatPrice(saved)}</strong> on this order</span>
          </p>
        ) : items.length && !priced ? (
          <p className="summaryFoot">Delivery is added when you choose it.</p>
        ) : null}
      </div>
    </aside>
  );
}
