"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Info, ShoppingBag, Wallet } from "lucide-react";
import { DeliveryChargeNote, ShippingFee } from "@/components/checkout/DeliveryChargeNote";
import { Media } from "@/components/ui";
import { CheckoutOfferSheet, OfferBox } from "@/components/offers/OfferBox";
import { IDEMPOTENCY_STORAGE_KEY, PAYMENT_STORAGE_KEY, SHIPPING_SELECTION_KEY, applyBagDiscount, deliveryChargeSplit, retainCheckoutDraft, shippingForPayment, type ShippingSelection } from "@/lib/checkout";
import { couponDiscount, couponDiscountPaise, eligibleAmount, formatPrice, subtotal } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { CartItem, Coupon } from "@/lib/types";

function lineOffer(item: CartItem, items: CartItem[], coupon?: Coupon) {
  const markedUnit = item.compareAtPrice && item.compareAtPrice > item.price ? item.compareAtPrice : item.price;
  const marked = markedUnit * item.quantity;
  let payable = item.price * item.quantity;
  if (coupon) {
    const applies = coupon.scope === "order"
      || (coupon.scope === "product" && coupon.productId === item.productId)
      || (coupon.scope === "category" && coupon.categoryId === item.categoryId);
    const base = eligibleAmount(items, coupon);
    const discount = couponDiscount(items, coupon);
    if (applies && base > 0 && discount > 0) payable = Math.max(0, payable - Math.round((payable / base) * discount));
  }
  return { marked, payable, offer: payable < marked };
}

function quoteMatchesBag(selection: ShippingSelection, goodsPaise: number) {
  return selection.subtotalPaise === goodsPaise;
}

function SubtotalNote({ items, coupon, total, saved }: { items: CartItem[]; coupon?: Coupon; total: number; saved: number }) {
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
        aria-label="How the item prices add up"
        onClick={() => setOpen((current) => !current)}
      >
        <Info size={14} strokeWidth={1.8} />
      </button>
      {open ? (
        <span ref={panelRef} className="chargeNotePanel subtotalNote" id={panelId} role="note" style={{ left: place.left, top: place.top }}>
          {items.map((item) => {
            const selling = item.price * item.quantity;
            const marked = item.compareAtPrice && item.compareAtPrice > item.price ? item.compareAtPrice * item.quantity : selling;
            return (
              <span className="chargeRow" key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  {item.variantLabel} · Qty {item.quantity}
                </span>
                <span className="chargeFee">
                  {marked > selling ? <s>{formatPrice(marked)}</s> : null}
                  <b className={marked > selling ? "offerPrice" : ""}>{formatPrice(selling)}</b>
                </span>
              </span>
            );
          })}
          <p>Item total is the price before a coupon. A crossed-out price beside an item is an earlier price and is not added.{coupon && saved > 0 ? ` ${coupon.code} is listed on its own, so you save ${formatPrice(saved)}.` : ""}</p>
          <span className="chargeRow chargeRowTotal">
            <span>Item total</span>
            <span>{formatPrice(total)}</span>
          </span>
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
  const seenDiscount = useRef<number | null>(null);
  const items = store.cart;
  const goods = subtotal(items);
  const goodsPaise = Math.round(goods * 100);
  const coupon = store.coupons.find((item) => item.code === store.couponCode && item.active);
  const discountPaise = coupon ? couponDiscountPaise(items, coupon) : 0;
  const discount = discountPaise / 100;
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const bagKey = items.map((item) => `${item.productId}:${item.variantLabel}:${item.quantity}:${item.price}`).join("|");

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
            const prices = lineOffer(item, items, coupon);
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
      <CheckoutOfferSheet open={offersOpen} onClose={() => setOffersOpen(false)} />
      <div className="summaryLine">
        <span className="summaryWithNote"><ShoppingBag size={15} aria-hidden /> Item total{items.length ? <SubtotalNote items={items} coupon={coupon} total={goods} saved={discount} /> : null}</span>
        <span>{formatPrice(goods)}</span>
      </div>
      {coupon && discount > 0 ? (
        <div className="summaryLine">
          <span>{coupon.code}</span>
          <span className="chargeFree">Saved {formatPrice(discount)}</span>
        </div>
      ) : null}
      <div className="summaryLine">
        <span className="summaryWithNote">Shipping fee{priced ? <DeliveryChargeNote selection={priced} /> : null}</span>
        <span>
          {charges ? (
            <span className="chargeEarned">
              <ShippingFee amountPaise={charges.shippingPaise} free={charges.shippingFree} />
              {charges.shippingFree ? <span className="chargeEarnedLine">You earned this</span> : null}
            </span>
          ) : "Confirmed before payment"}
        </span>
      </div>
      {charges && charges.codPaise > 0 ? (
        <div className="summaryLine">
          <span>COD charges</span>
          <span>{formatPrice(charges.codPaise / 100)}</span>
        </div>
      ) : null}
      {priced && priced.codFeePaise > 0 ? (
        <div className="summaryLine"><span>Cash on delivery fee</span><span>{formatPrice(priced.codFeePaise / 100)}</span></div>
      ) : null}
      <div className="summaryTotal">
        <span className="summaryWithNote"><Wallet size={15} aria-hidden /> To pay</span>
        <strong>{formatPrice(priced ? priced.amountPaise / 100 : merchandise)}</strong>
      </div>
      <p className="summaryFoot">{priced ? "This is the amount after your coupon, including delivery." : discount > 0 ? "This is the amount after your coupon. Delivery is added when you choose it." : "Delivery is added when you choose it."}</p>
    </aside>
  );
}
