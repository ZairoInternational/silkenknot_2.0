"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { onBagCelebrate } from "@/lib/bagCelebrate";

const PARTICLES = Array.from({ length: 18 }, (_, index) => {
  const angle = (index / 18) * Math.PI * 2;
  const dist = 90 + (index % 4) * 28;
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist - 20,
    delay: (index % 6) * 0.04,
    size: index % 3 === 0 ? 7 : 5,
  };
});

function onCheckout(pathname: string | null) {
  return Boolean(pathname?.startsWith("/checkout"));
}

/** Full-viewport green achievement — only when a coupon is applied/updated on checkout. */
export function CouponCelebrate() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const timer = useRef<number | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  function play() {
    if (!onCheckout(pathRef.current)) return;
    if (timer.current) window.clearTimeout(timer.current);
    setOpen(true);
    timer.current = window.setTimeout(() => setOpen(false), reduceMotion ? 1200 : 2600);
  }

  useEffect(() => {
    setReady(true);
    return onBagCelebrate((reason) => {
      if (reason !== "coupon") return;
      play();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once; path/reduceMotion read via refs/closure on fire
  }, [reduceMotion]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  if (!ready) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="coupon-celebrate"
          className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="status"
          aria-live="polite"
        >
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(95,125,87,0.32),rgba(95,125,87,0.1)_42%,transparent_70%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.9, 0] }}
            transition={{ duration: reduceMotion ? 1 : 2.2, ease: "easeOut" }}
            aria-hidden
          />
          {!reduceMotion
            ? PARTICLES.map((dot, index) => (
                <motion.span
                  key={index}
                  className="absolute left-1/2 top-[42%] rounded-full bg-[#5f7d57]"
                  style={{ width: dot.size, height: dot.size, marginLeft: -dot.size / 2, marginTop: -dot.size / 2 }}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  animate={{ opacity: [0, 1, 0], x: dot.x, y: dot.y, scale: [0.3, 1.15, 0.2] }}
                  transition={{ duration: 1.15, delay: 0.08 + dot.delay, ease: "easeOut" }}
                  aria-hidden
                />
              ))
            : null}
          <motion.div
            className="relative z-[1] mx-4 flex max-w-sm items-center gap-3 rounded-2xl border border-[#c9d9c4] bg-[#f4f8f2] px-5 py-4 shadow-[0_18px_50px_-18px_rgba(63,90,57,0.6)]"
            initial={{ opacity: 0, scale: 0.88, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#5f7d57] text-white"
              animate={reduceMotion ? undefined : { scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }}
              transition={{ duration: 0.55 }}
              aria-hidden
            >
              <Sparkles size={20} strokeWidth={2} />
            </motion.span>
            <div>
              <p className="text-sm font-medium text-[#3f5a39]">Coupon applied</p>
              <p className="mt-0.5 text-xs text-[#6f7d68]">Savings unlocked on this bag</p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
