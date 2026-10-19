"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, Gift, Tag, X } from "lucide-react";
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
    <div className="overflow-hidden rounded-2xl border border-[#e3dbd1] bg-[#fbf9f6]">
      <div className="flex items-center gap-3 px-3 py-3">
        <Tag size={18} className="shrink-0 text-[#CBAC7C]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-wide text-[#2c2926]">{featured.code}</p>
          <p className="truncate text-xs text-[#6f675d]">{featured.label}</p>
        </div>
        <button
          type="button"
          onClick={() => apply(featured)}
          className={`h-8 shrink-0 rounded-md px-3 text-xs ${store.couponCode === featured.code ? "border border-[#2c2926] bg-white text-[#2c2926]" : "bg-[#CBAC7C] text-white hover:bg-[#B39668]"}`}
        >
          {store.couponCode === featured.code ? "Applied" : "Apply"}
        </button>
      </div>
      <button type="button" onClick={() => setCodeOpen((open) => !open)} className="flex w-full items-center gap-2 border-t border-[#e3dbd1] px-3 py-2.5 text-left text-sm text-[#4e4943]">
        Enter coupon code
        <ChevronDown size={16} className={`text-[#8a7350] transition ${codeOpen ? "rotate-180" : ""}`} />
      </button>
      {codeOpen ? (
        <form
          className="flex items-center gap-2 px-3 pb-3"
          onSubmit={(event) => {
            event.preventDefault();
            const result = store.applyCoupon(code);
            setNote(result.message || (result.ok ? "Offer applied." : ""));
            if (result.ok) setCode("");
          }}
        >
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Code" className="h-10 min-w-0 flex-1 rounded-lg border border-[#e3dbd1] bg-white px-3 text-sm outline-none" />
          <button type="submit" className="h-10 rounded-md bg-[#CBAC7C] px-4 text-xs text-white hover:bg-[#B39668]">Apply</button>
        </form>
      ) : null}
      <button type="button" onClick={onOpenAll} className="flex w-full items-center gap-3 border-t border-[#e3dbd1] px-3 py-3 text-left">
        <Gift size={18} className="shrink-0 text-[#CBAC7C]" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-[#2c2926]">View all offers</span>
          <span className="block text-xs text-[#6f675d]">Coupons</span>
        </span>
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#2c2926] px-1.5 text-xs text-white">{offers.length}</span>
        <ChevronRight size={16} className="text-[#2c2926]" />
      </button>
      {note ? <p className="border-t border-[#e3dbd1] px-3 py-2 text-xs text-[#6f675d]">{note}</p> : null}
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
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-xl font-medium text-[#2c2926]">Offers</p>
        <button type="button" aria-label="Close offers" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center group/close bg-black/10 hover:bg-black/16 rounded-full">
          <X size={16} className="group-hover/close:rotate-90 transition-transform duration-200"/>
        </button>
      </div>
      <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-5">
        {offers.map((offer) => {
          const applied = store.couponCode === offer.code;
          return (
            <li key={offer.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${applied ? "border-[#2c2926] bg-[#fbf9f6]" : "border-[#e3dbd1] bg-white"}`}>
              <Tag size={18} className="shrink-0 text-[#CBAC7C]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-wide text-[#2c2926]">{offer.code}</p>
                <p className="text-xs text-[#6f675d]">{offer.label}</p>
              </div>
              <button
                type="button"
                onClick={() => apply(offer)}
                className={`h-8 shrink-0 rounded-md px-3 text-xs ${applied ? "border border-[#2c2926] bg-white text-[#2c2926]" : "bg-[#CBAC7C] text-white hover:bg-[#B39668]"}`}
              >
                {applied ? "Applied" : "Apply"}
              </button>
            </li>
          );
        })}
      </ul>
      {note ? <p className="px-5 pb-4 text-xs text-[#6f675d]">{note}</p> : null}
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
