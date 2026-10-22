"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";
import { OfferBox, OfferList } from "@/components/offers/OfferBox";
import { couponDiscount, formatPrice, subtotal } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Media, Quantity, useDialog } from "@/components/ui";

export function CartSheet() {
  const store = useStore();
  const open = store.cartOpen;
  const ref = useDialog(open, store.closeCart);
  const [offersOpen, setOffersOpen] = useState(false);
  useEffect(() => {
    if (!open) setOffersOpen(false);
  }, [open]);
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
          className="fixed bottom-4 right-4 z-[70] flex h-[max(78vh,560px)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] md:bottom-6 md:right-[60px]"
          initial={{ y: "120%" }}
          animate={{ y: 0 }}
          exit={{ y: "120%" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {offersOpen ? (
            <OfferList onClose={() => setOffersOpen(false)} />
          ) : (
          <>
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-xl font-medium">Your bag</p>
            <button type="button" aria-label="Close bag" onClick={store.closeCart} className="inline-flex h-8 w-8 items-center justify-center group/close bg-black/10 hover:bg-black/16 rounded-full">
              <X size={16} className="transition-transform duration-200 group-hover/close:rotate-90" />
            </button>
          </div>
          {store.cart.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-5 pb-8 text-center">
              <ShoppingBag size={88} strokeWidth={1.15} className="text-ink/80" />
              <p className="mt-6 font-serif text-3xl">Your bag is empty.</p>
              <Link href="/shop" onClick={store.closeCart} className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#CBAC7C] px-8 text-[11px] uppercase tracking-[0.16em] text-white hover:bg-[#B39668]">
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
                          compact
                          value={item.quantity}
                          min={0}
                          max={store.productById(item.productId)?.variants.find((variant) => variant.label === item.variantLabel)?.stock ?? 99}
                          onChange={(value) => store.setQuantity(item.id, value)}
                        />
                        <button type="button" className="text-[11px] text-[#b5aa9c] underline-offset-2 hover:text-[#6f675d] hover:underline" onClick={() => store.removeFromCart(item.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line px-5 py-4">
                <OfferBox onOpenAll={() => setOffersOpen(true)} />
                <div className="mt-4 flex items-baseline justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(goods)}</span>
                </div>
                {coupon && discount > 0 ? (
                  <div className="mt-1 flex items-baseline justify-between text-sm text-[#8a7350]">
                    <span>{coupon.code}</span>
                    <span>−{formatPrice(discount)}</span>
                  </div>
                ) : null}
                <div className="mt-2 flex items-baseline justify-between text-sm font-medium">
                  <span>Total</span>
                  <span>{formatPrice(Math.max(0, goods - discount))}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link href="/shop" onClick={store.closeCart} className="flex h-11 items-center justify-center border border-[#CBAC7C] text-[11px] uppercase tracking-[0.14em] text-[#8a7350] hover:bg-[#CBAC7C] hover:text-white">
                    View shop
                  </Link>
                  <Link href="/checkout" onClick={store.closeCart} className="flex h-11 items-center justify-center bg-[#CBAC7C] text-[11px] uppercase tracking-[0.14em] text-white hover:bg-[#B39668]">
                    Checkout
                  </Link>
                </div>
              </div>
            </>
          )}
          </>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
