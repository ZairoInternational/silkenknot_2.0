"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles, Truck } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useShippingDisplay } from "@/lib/shipping/client";

type FreeShippingProgressProps = {
  /** Bag total after discounts, in rupees (same basis as checkout free-shipping). */
  amount: number;
  /** Override threshold in rupees; defaults to admin shipping free-shipping setting. */
  threshold?: number;
  className?: string;
};

const BURST = [
  { x: -28, y: -18, delay: 0 },
  { x: 22, y: -24, delay: 0.04 },
  { x: -16, y: 14, delay: 0.08 },
  { x: 30, y: 8, delay: 0.06 },
  { x: 4, y: -30, delay: 0.1 },
  { x: -32, y: 2, delay: 0.12 },
];

export function FreeShippingProgress({
  amount,
  threshold: thresholdProp,
  className = "",
}: FreeShippingProgressProps) {
  const shipping = useShippingDisplay();
  const threshold = thresholdProp ?? shipping.freeShippingAt;
  const reduceMotion = useReducedMotion();
  const [celebrate, setCelebrate] = useState(false);
  const wasUnlocked = useRef<boolean | null>(null);
  const clearTimer = useRef<number | null>(null);

  const active = threshold > 0;
  const net = Math.max(0, amount);
  const remaining = active ? Math.max(0, threshold - net) : 0;
  const unlocked = active && remaining <= 0;
  const percent = active ? Math.min(100, Math.round((net / threshold) * 100)) : 0;

  useEffect(() => {
    if (!active) {
      wasUnlocked.current = null;
      return;
    }
    if (wasUnlocked.current === null) {
      wasUnlocked.current = unlocked;
      return;
    }
    if (!wasUnlocked.current && unlocked) {
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
      setCelebrate(true);
      clearTimer.current = window.setTimeout(
        () => setCelebrate(false),
        reduceMotion ? 900 : 2200,
      );
      wasUnlocked.current = unlocked;
      return;
    }
    wasUnlocked.current = unlocked;
  }, [active, unlocked, reduceMotion]);

  useEffect(() => () => {
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
  }, []);

  if (!active) return null;

  return (
    <motion.div
      className={`relative overflow-hidden rounded-xl border px-3.5 py-3 transition-colors duration-300 ${
        unlocked
          ? "border-[#c9d9c4] bg-[#f4f8f2]"
          : "border-[#e8dfd2] bg-[#fbf8f3]"
      } ${className}`}
      animate={
        celebrate && !reduceMotion
          ? { scale: [1, 1.02, 1], boxShadow: ["0 0 0 rgba(95,125,87,0)", "0 0 24px rgba(95,125,87,0.22)", "0 0 0 rgba(95,125,87,0)"] }
          : { scale: 1, boxShadow: "0 0 0 rgba(95,125,87,0)" }
      }
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <AnimatePresence>
        {celebrate ? (
          <motion.div
            key="achieve"
            className="pointer-events-none absolute inset-0 z-[1]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            aria-hidden
          >
            <motion.div
              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(95,125,87,0.16),transparent_55%)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: reduceMotion ? 0.6 : 1.4 }}
            />
            {!reduceMotion
              ? BURST.map((dot, index) => (
                  <motion.span
                    key={index}
                    className="absolute left-8 top-4 h-1.5 w-1.5 rounded-full bg-[#5f7d57]"
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                    animate={{ opacity: [0, 1, 0], x: dot.x, y: dot.y, scale: [0.4, 1.2, 0.2] }}
                    transition={{ duration: 0.9, delay: dot.delay, ease: "easeOut" }}
                  />
                ))
              : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative z-[2] flex items-start gap-2.5">
        <motion.span
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors duration-300 ${
            unlocked ? "bg-[#5f7d57] text-white" : "bg-[#CBAC7C]/18 text-[#8a7350]"
          }`}
          animate={celebrate && !reduceMotion ? { scale: [1, 1.18, 1], rotate: [0, -8, 8, 0] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.55 }}
          aria-hidden
        >
          {unlocked ? (
            celebrate ? <Sparkles size={14} strokeWidth={2} /> : <Check size={14} strokeWidth={2.2} />
          ) : (
            <Truck size={14} strokeWidth={1.7} />
          )}
        </motion.span>
        <div className="min-w-0 flex-1">
          <p
            className={`text-[13px] leading-snug ${unlocked ? "text-[#3f5a39]" : "text-[#4e4943]"}`}
            aria-live="polite"
          >
            {unlocked ? (
              celebrate ? (
                <>
                  <span className="font-medium">Achievement unlocked</span>
                  <span className="text-[#6f7d68]"> · free delivery</span>
                </>
              ) : (
                <>
                  <span className="font-medium">Free delivery unlocked</span>
                  <span className="text-[#6f7d68]"> · on standard prepaid orders</span>
                </>
              )
            ) : (
              <>
                Add <span className="font-medium text-[#8a7350]">{formatPrice(remaining)}</span> more for{" "}
                <span className="font-medium">free delivery</span>
              </>
            )}
          </p>
          <div
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#e8dfd2]/90"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={
              unlocked
                ? "Free delivery unlocked"
                : `${formatPrice(remaining)} more for free delivery`
            }
          >
            <motion.div
              className={`h-full rounded-full ${unlocked ? "bg-[#5f7d57]" : "bg-[#CBAC7C]"}`}
              initial={false}
              animate={{ width: `${percent}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          {!unlocked ? (
            <p className="mt-1.5 text-[11px] leading-none text-[#9a9084]">
              Free on orders over {formatPrice(threshold)}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
