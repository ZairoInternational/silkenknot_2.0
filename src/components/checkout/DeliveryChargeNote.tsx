"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { deliveryChargeSplit, type ShippingSelection } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";

export function ShippingFee({ amountPaise, free }: { amountPaise: number; free: boolean }) {
  if (!free) return <span className="chargeFee">{formatPrice(amountPaise / 100)}</span>;
  if (amountPaise <= 0) return <span className="chargeFree">Free</span>;
  return (
    <span className="chargeFee">
      <s>{formatPrice(amountPaise / 100)}</s>
      <span className="chargeFree">Free</span>
    </span>
  );
}

function shippingNotes(selection: ShippingSelection) {
  const split = deliveryChargeSplit(selection);
  const net = selection.subtotalPaise - selection.discountPaise;
  const threshold = selection.freeShippingPaise ?? 0;
  const offer = threshold > 0;
  const standard = selection.optionId === "standard";
  const qualifies = offer && standard && net >= threshold;
  const offerPrice = offer ? formatPrice(threshold / 100) : "";
  const lines: string[] = [];

  if (split.payingCod && (qualifies || selection.shippingDiscountPaise > 0)) {
    lines.push(offer
      ? `Free shipping on orders of ${offerPrice} or more applies when you pay online.`
      : "Free shipping on this order applies when you pay online.");
    lines.push("Pay on delivery does not get that offer, so the shipping fee stays. Pay online to remove it.");
  } else if (split.payingCod && offer && !standard) {
    lines.push(`Free shipping on orders of ${offerPrice} or more is for standard delivery when you pay online. Express keeps the shipping fee, and pay on delivery adds COD charges.`);
  } else if (split.payingCod && offer && standard && net < threshold) {
    lines.push(`Free shipping starts at ${offerPrice}. This order is ${formatPrice((threshold - net) / 100)} short, so the shipping fee stays. Pay on delivery also adds COD charges.`);
  } else if (split.payingCod && split.codPaise > 0) {
    lines.push(`Pay on delivery adds COD charges of ${formatPrice(split.codPaise / 100)} on top of the shipping fee.`);
  } else if (split.shippingFree) {
    lines.push(offer
      ? `You earned free shipping. This order is ${offerPrice} or more and you are paying online.`
      : "You earned free shipping on this order.");
  } else if (offer && !standard) {
    lines.push(`Free shipping on orders of ${offerPrice} or more is for standard delivery when you pay online. Express keeps the shipping fee.`);
  } else if (offer && standard && net < threshold) {
    lines.push(`Free shipping starts at ${offerPrice}. Add ${formatPrice((threshold - net) / 100)} more, and pay online, to remove the shipping fee.`);
  }
  return lines;
}

export function DeliveryChargeNote({ selection }: { selection: ShippingSelection }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ left: 12, top: 12 });
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  const split = deliveryChargeSplit(selection);
  const prepaidPaise = selection.prepaidChargePaise ?? selection.chargePaise;
  const prepaidFree = prepaidPaise === 0;
  const prepaidListPaise = prepaidFree && selection.shippingDiscountPaise > 0 ? selection.shippingDiscountPaise : prepaidPaise;
  const notes = shippingNotes(selection);

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
  }, [open, notes.length]);

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
        aria-label="Shipping fee details"
        onClick={() => setOpen((current) => !current)}
      >
        <Info size={14} strokeWidth={1.8} />
      </button>
      {open ? (
        <span ref={panelRef} className="chargeNotePanel" id={panelId} role="note" style={{ left: place.left, top: place.top }}>
          <span className="chargeRow chargeRowTotal">
            <span>Shipping fee</span>
            <ShippingFee amountPaise={split.payingCod ? split.shippingPaise : (split.shippingFree ? prepaidListPaise : split.shippingPaise)} free={split.shippingFree} />
          </span>
          {split.payingCod && split.codPaise > 0 ? (
            <span className="chargeRow chargeRowTotal">
              <span>COD charges</span>
              <span className="chargeFee">{formatPrice(split.codPaise / 100)}</span>
            </span>
          ) : null}
          {notes.map((line) => <p key={line} className={line.startsWith("You earned") ? "chargeEarnedNote" : undefined}>{line}</p>)}
        </span>
      ) : null}
    </span>
  );
}
