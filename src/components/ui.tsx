"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion as useFramerReduced } from "framer-motion";
import { discountPercent, formatPrice } from "@/lib/format";

export const ease = [0.22, 1, 0.36, 1] as const;

export function usePrefersReducedMotion() {
  const reduced = useFramerReduced();
  return Boolean(reduced);
}

export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      const node = ref.current?.querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      node?.focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !ref.current) return;
      const nodes = [...ref.current.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      )].filter((node) => !node.hasAttribute("disabled"));
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, onClose]);

  return ref;
}

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.8, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

export function Mark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <circle cx="13" cy="16" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="19" cy="16" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function Media({
  src,
  alt,
  className = "object-cover",
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return (
      // Uploaded studio images are data URLs, which next/image does not optimize.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={`absolute inset-0 h-full w-full ${className}`} />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      quality={70}
      priority={priority}
      className={className}
    />
  );
}

export function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="text-[11px] tracking-[0.18em] text-ink" aria-label={`${rating} out of 5 stars`}>
      {"★★★★★".slice(0, full)}
      <span className="text-stone">{"★★★★★".slice(full)}</span>
    </span>
  );
}

export function PriceTag({ price, compare }: { price: number; compare?: number }) {
  const off = discountPercent(price, compare);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span>{formatPrice(price)}</span>
      {off > 0 && compare ? (
        <>
          <s className="text-mute">{formatPrice(compare)}</s>
          <span className="text-[11px] uppercase tracking-[0.16em] text-olive">{off}% off</span>
        </>
      ) : null}
    </p>
  );
}

export function Quantity({
  value,
  onChange,
  max = 99,
  min = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
}) {
  return (
    <div className="inline-flex items-center border border-line">
      <button
        type="button"
        className="h-10 w-10"
        aria-label={min < 1 && value <= 1 ? "Remove item" : "Decrease quantity"}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span className="min-w-8 text-center text-sm" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="h-10 w-10"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id || props.name;
  return (
    <div>
      <label htmlFor={id} className="eyebrow text-mute">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="mt-2 h-12 w-full border-b border-line bg-transparent outline-none transition-colors focus:border-ink"
      />
    </div>
  );
}

export function BottomSheet({
  open,
  onClose,
  label,
  children,
  tall = false,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  tall?: boolean;
}) {
  const ref = useDialog(open, onClose);
  return (
    <AnimatePresence>
      {open ? (
        <motion.button
          key="overlay"
          type="button"
          aria-label="Close overlay"
          className="fixed inset-0 z-[75] bg-ink/40"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        />
      ) : null}
      {open ? (
        <motion.div
          key="sheet"
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className={`fixed inset-x-0 bottom-0 z-[80] flex flex-col rounded-t-[28px] bg-paper shadow-[0_-24px_80px_rgba(28,27,25,0.18)] ${
            tall ? "max-h-[94vh] md:max-h-[86vh]" : "max-h-[85vh]"
          }`}
          initial={{ y: "100%", opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0.4 }}
          transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.85 }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function useMeasuredHeader(target: React.RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState(108);
  useEffect(() => {
    const node = target.current;
    if (!node) return;
    const measure = () => setHeight(node.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [target]);
  return height;
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 bg-ink px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-paper transition duration-500 ${
        message ? "opacity-100" : "opacity-0"
      }`}
    >
      {message}
    </div>
  );
}
