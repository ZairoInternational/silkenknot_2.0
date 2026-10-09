"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";
import { couponDiscount, formatPrice, subtotal } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Media, Quantity, useDialog } from "@/components/ui";

export function CartSheet() {
  const store = useStore();
  const open = store.cartOpen;
  const ref = useDialog(open, store.closeCart);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const goods = subtotal(store.cart);
  const coupon = store.coupons.find((item) => item.code === store.couponCode && item.active);
  const discount = coupon ? couponDiscount(store.cart, coupon) : 0;

  return (
    <AnimatePresence>
      {open ? (
        <motion.button
          type="button"
          aria-label="Close bag"
          className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={store.closeCart}
        />
      ) : null}
      {open ? (
        <motion.div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label="Your bag"
          className="fixed bottom-4 right-4 z-[70] flex h-[min(78vh,560px)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] md:bottom-6 md:right-[60px]"
          initial={{ y: "120%" }}
          animate={{ y: 0 }}
          exit={{ y: "120%" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-xl font-medium">Your bag</p>
            <button type="button" aria-label="Close bag" onClick={store.closeCart} className="inline-flex h-8 w-8 items-center justify-center">
              <X size={16} />
            </button>
          </div>
          {store.cart.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-5 pb-8 text-center">
              <ShoppingBag size={88} strokeWidth={1.15} className="text-ink/80" />
              <p className="mt-6 font-serif text-3xl">Your bag is empty.</p>
              <Link href="/shop" onClick={store.closeCart} className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-ink px-8 text-[11px] uppercase tracking-[0.16em] text-white">
                Start shopping
              </Link>
            </div>
          ) : (
            <>
              <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5">
                {store.cart.map((item) => (
                  <li key={item.id} className="grid grid-cols-[64px_1fr] gap-3 border-b border-line pb-4">
                    <Link href={`/products/${item.slug}`} onClick={store.closeCart} className="relative block aspect-square bg-cream">
                      <Media src={item.image} alt="" sizes="64px" className="object-contain" />
                    </Link>
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/products/${item.slug}`} onClick={store.closeCart} className="text-sm">
                          {item.name}
                        </Link>
                        <p className="text-sm">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                      <p className="mt-1 text-xs text-mute">{item.variantLabel}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <Quantity
                          value={item.quantity}
                          min={0}
                          max={store.productById(item.productId)?.variants.find((variant) => variant.label === item.variantLabel)?.stock ?? 99}
                          onChange={(value) => store.setQuantity(item.id, value)}
                        />
                        <button type="button" className="text-xs text-mute underline-offset-2 hover:underline" onClick={() => store.removeFromCart(item.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line px-5 py-4">
                <form
                  className="flex gap-2 border-b border-line"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const result = store.applyCoupon(code);
                    setNote(result.message || (result.ok ? "Offer applied." : ""));
                    if (result.ok) setCode("");
                  }}
                >
                  <label htmlFor="bag-code" className="sr-only">Offer code</label>
                  <input id="bag-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Offer code" className="h-10 flex-1 bg-transparent text-sm outline-none" />
                  <button type="submit" className="text-[11px] uppercase tracking-[0.14em]">Apply</button>
                </form>
                {note ? <p className="mt-2 text-xs text-mute">{note}</p> : null}
                <div className="mt-4 flex items-baseline justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(Math.max(0, goods - discount))}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link href="/shop" onClick={store.closeCart} className="flex h-11 items-center justify-center border border-ink text-[11px] uppercase tracking-[0.14em]">
                    View shop
                  </Link>
                  <Link href="/checkout" onClick={store.closeCart} className="flex h-11 items-center justify-center bg-ink text-[11px] uppercase tracking-[0.14em] text-white">
                    Checkout
                  </Link>
                </div>
              </div>
            </>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
