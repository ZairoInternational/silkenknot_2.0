"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Gift, Tag, X } from "lucide-react";
import { couponDiscount } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Coupon } from "@/lib/types";

export function OfferBox({ onOpenAll }: { onOpenAll: () => void }) {
  const store = useStore();
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const offers = store.coupons.filter((item) => item.active);
  const featured = offers.find((item) => item.code === store.couponCode)
    ?? offers.find((item) => couponDiscount(store.cart, item) > 0)
    ?? offers[0];
  if (!featured) return null;

  const applied = store.couponCode === featured.code;

  function apply(offer: Coupon) {
    if (store.couponCode === offer.code) {
      store.clearCoupon();
      setNote("");
      return;
    }
    const result = store.applyCoupon(offer.code);
    setNote(result.message || (result.ok ? "Offer applied." : ""));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#c5dde0] bg-[#f4fafb]">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e8f4f5] text-[#61A2AF]">
          <Tag size={14} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold tracking-wide text-ink">{featured.code}</p>
          {featured.label ? <p className="truncate text-[11px] leading-tight text-mute">{featured.label}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => apply(featured)}
          className={`h-7 shrink-0 rounded-lg px-2.5 text-[11px] font-medium ${
            applied
              ? "border border-[#61A2AF] bg-white text-[#3A6B75]"
              : "bg-[#61A2AF] text-white hover:bg-[#4F8A96]"
          }`}
        >
          {applied ? "Remove" : "Apply"}
        </button>
      </div>

      <div className="flex items-center gap-2 border-t border-[#c5dde0] bg-white px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => setCodeOpen((open) => !open)}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#3A6B75]"
        >
          Enter code
          <ChevronDown size={14} className={`transition ${codeOpen ? "rotate-180" : ""}`} />
        </button>
        <span className="text-[#c5dde0]" aria-hidden>|</span>
        <button
          type="button"
          onClick={onOpenAll}
          className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-[12px] font-medium text-[#3A6B75]"
        >
          <Gift size={13} className="shrink-0" />
          <span className="truncate">View all</span>
          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e8f4f5] px-1.5 text-[10px] font-semibold text-[#3A6B75]">
            {offers.length}
          </span>
        </button>
      </div>

      {codeOpen ? (
        <form
          className="flex items-center gap-2 border-t border-[#c5dde0] bg-white px-2.5 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            const result = store.applyCoupon(code);
            setNote(result.message || (result.ok ? "Offer applied." : ""));
            if (result.ok) setCode("");
          }}
        >
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Coupon code"
            className="h-8 min-w-0 flex-1 rounded-lg border border-[#c5dde0] bg-white px-2.5 text-[13px] text-ink outline-none focus:border-[#61A2AF]"
          />
          <button type="submit" className="h-8 rounded-lg bg-[#61A2AF] px-3 text-[11px] font-medium text-white hover:bg-[#4F8A96]">
            Apply
          </button>
        </form>
      ) : null}

      {note ? <p className="border-t border-[#c5dde0] bg-white px-2.5 py-1.5 text-[11px] text-[#6f675d]">{note}</p> : null}
    </div>
  );
}

export function OfferList({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [note, setNote] = useState("");
  const offers = store.coupons.filter((item) => item.active);

  function apply(offer: Coupon) {
    if (store.couponCode === offer.code) {
      store.clearCoupon();
      setNote("");
      return;
    }
    const result = store.applyCoupon(offer.code);
    setNote(result.message || (result.ok ? "Offer applied." : ""));
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[#c5dde0] px-4 py-3">
        <p className="text-lg font-medium text-ink">Offers</p>
        <button type="button" aria-label="Close offers" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f4f5] text-[#3A6B75] transition hover:bg-[#d7eef1]">
          <X size={16} />
        </button>
      </div>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {offers.map((offer) => {
          const applied = store.couponCode === offer.code;
          return (
            <li key={offer.id} className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 ${applied ? "border-[#61A2AF] bg-[#f4fafb]" : "border-[#c5dde0] bg-white"}`}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e8f4f5] text-[#61A2AF]">
                <Tag size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold tracking-wide text-ink">{offer.code}</p>
                <p className="truncate text-[11px] text-mute">{offer.label}</p>
              </div>
              <button
                type="button"
                onClick={() => apply(offer)}
                className={`h-7 shrink-0 rounded-lg px-2.5 text-[11px] font-medium ${
                  applied
                    ? "border border-[#61A2AF] bg-white text-[#3A6B75]"
                    : "bg-[#61A2AF] text-white hover:bg-[#4F8A96]"
                }`}
              >
                {applied ? "Remove" : "Apply"}
              </button>
            </li>
          );
        })}
      </ul>
      {note ? <p className="px-4 pb-3 text-[11px] text-[#6f675d]">{note}</p> : null}
    </div>
  );
}

export function CheckoutOfferSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close offers"
            className="fixed inset-0 z-[80] bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Offers"
            className="fixed inset-y-0 right-0 z-[90] flex w-[min(400px,100vw)] flex-col bg-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <OfferList onClose={onClose} />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
