"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Feather, HandHeart, Leaf, X } from "lucide-react";
import { Media, ease, useDialog, usePrefersReducedMotion } from "@/components/ui";
import { useBrandSettings } from "@/lib/brand/client";
import { useStore } from "@/lib/store";

const STORAGE_KEY = "sk-welcome-scratch";
const PRIZE_CODE = "RITUAL10";
const PRIZE_LABEL = "10% off your order";
const SCROLL_TRIGGER = 0.28;
const REVEAL_RATIO = 0.42;

const claims = [
  { label: "Plant-based", icon: Leaf },
  { label: "Quiet scents", icon: Feather },
  { label: "Small batch", icon: HandHeart },
] as const;

type Phase = "closed" | "open" | "revealed" | "claimed";

function alreadySeen() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

function wantsPreview() {
  try {
    return new URLSearchParams(window.location.search).has("previewScratch");
  } catch {
    return false;
  }
}

export function WelcomeScratchOffer() {
  const store = useStore();
  const brand = useBrandSettings();
  const reduced = usePrefersReducedMotion();
  const titleId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scratching = useRef(false);
  const [phase, setPhase] = useState<Phase>("closed");
  const [scratched, setScratched] = useState(0);

  const dismiss = useCallback(() => {
    markSeen();
    setPhase("closed");
  }, []);

  const dialogRef = useDialog(phase !== "closed", dismiss);

  useEffect(() => {
    if (wantsPreview()) {
      setPhase("open");
      return;
    }
    if (alreadySeen()) return;

    let armed = true;
    const onScroll = () => {
      if (!armed) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      if (progress >= SCROLL_TRIGGER || window.scrollY > 520) {
        armed = false;
        setPhase("open");
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (phase === "closed") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  const paintCover = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const { width, height } = canvas;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#d4b78a");
    gradient.addColorStop(0.45, "#cbac7c");
    gradient.addColorStop(1, "#a68456");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 90; i += 1) {
      ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * width, Math.random() * height, 1 + Math.random() * 3, 1);
    }

    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = `600 ${Math.max(14, Math.round(width * 0.045))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("REVEAL HERE", width / 2, height / 2);
  }, []);

  useEffect(() => {
    if (phase !== "open" || reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const size = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      paintCover();
      setScratched(0);
    };
    size();
    const observer = new ResizeObserver(size);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [phase, reduced, paintCover]);

  const measureReveal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let clear = 0;
    const step = 16;
    for (let i = 3; i < data.length; i += 4 * step) {
      if (data[i] < 32) clear += 1;
    }
    const ratio = clear / (data.length / (4 * step));
    setScratched(ratio);
    if (ratio >= REVEAL_RATIO) setPhase("revealed");
  }, []);

  const scratchAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || phase !== "open") return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * canvas.width;
      const y = ((clientY - rect.top) / rect.height) * canvas.height;
      const radius = Math.max(canvas.width, canvas.height) * 0.09;
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    },
    [phase],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    scratching.current = true;
    scratchAt(event.clientX, event.clientY);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!scratching.current) return;
    scratchAt(event.clientX, event.clientY);
  };

  const onPointerUp = () => {
    if (!scratching.current) return;
    scratching.current = false;
    measureReveal();
  };

  const revealNow = () => setPhase("revealed");

  const claim = () => {
    const result = store.applyCoupon(PRIZE_CODE);
    try {
      void navigator.clipboard?.writeText(PRIZE_CODE);
    } catch {
      /* ignore */
    }
    if (result.ok) {
      store.notify(`${PRIZE_CODE} applied`);
    } else {
      store.notify(`${PRIZE_CODE} copied — add to bag to use it`);
    }
    markSeen();
    setPhase("claimed");
    window.setTimeout(() => setPhase("closed"), 900);
  };

  const open = phase !== "closed";
  const showPrize = phase === "revealed" || phase === "claimed" || reduced;

  return (
    <AnimatePresence>
      {open ? (
        <motion.button
          key="scratch-overlay"
          type="button"
          aria-label="Close welcome offer"
          className="fixed inset-0 z-[90] bg-[#1c1b19]/45 backdrop-blur-[2px]"
          onClick={dismiss}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease }}
        />
      ) : null}
      {open ? (
        <motion.div
          key="scratch-dialog"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="pointer-events-none fixed inset-0 z-[95] flex items-end justify-center p-0 md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease }}
        >
          <motion.div
            className="pointer-events-auto relative flex max-h-[92vh] w-full max-w-[920px] flex-col overflow-y-auto rounded-t-[28px] bg-[#f6f3ee] shadow-[0_32px_90px_rgba(28,27,25,0.28)] md:max-h-[min(88vh,640px)] md:flex-row md:overflow-hidden md:rounded-[28px]"
            initial={{ y: 40, opacity: 0.85, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.38, ease }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={dismiss}
              className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full bg-[#f6f3ee]/85 text-[#2c2926] shadow-sm backdrop-blur-sm transition hover:bg-white md:right-4 md:top-4"
            >
              <X size={16} strokeWidth={1.75} />
            </button>

            {/* Product panel */}
            <div className="relative flex shrink-0 flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,#efeae3_0%,#e8dfd2_48%,#dccfb8_100%)] px-5 pb-4 pt-6 md:min-h-0 md:flex-1 md:px-8 md:pb-8 md:pt-10">
              <p className="hidden max-w-[16rem] text-base leading-7 text-[#5c564e] md:block">
                Soft formulas, quiet scents, and jars made in small batches.
              </p>
              <div className="relative mx-auto aspect-square w-[42%] max-w-[160px] md:mt-0 md:w-[min(86%,320px)] md:max-w-none">
                <div className="absolute inset-[8%] rounded-full bg-[#f6f3ee]/55 blur-2xl" aria-hidden />
                <Media
                  src="/silknknot/whipped_shop.jpg"
                  alt="Silken Knot whipped soap jar"
                  sizes="(min-width: 768px) 320px, 40vw"
                  className="object-contain drop-shadow-[0_24px_40px_rgba(62,47,28,0.22)]"
                  priority
                />
              </div>
              <ul className="mt-3 flex items-center justify-between gap-2 md:mt-6">
                {claims.map((claim) => (
                  <li key={claim.label} className="flex flex-1 flex-col items-center gap-1.5 text-center text-[#5c564e] md:gap-2">
                    <span className="grid size-9 place-items-center rounded-full border border-[#cfc4b6] bg-[#f6f3ee]/55 md:size-12">
                      <claim.icon size={17} strokeWidth={1.25} />
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] md:text-[11px]">{claim.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Scratch panel */}
            <div className="flex flex-1 flex-col items-center bg-[#fbf9f6] px-6 pb-8 pt-4 md:px-10 md:pb-10 md:pt-12">
              <div className="relative mb-3 h-9 w-24 md:mb-5 md:h-10 md:w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={brand.iconUrl} alt={brand.iconAlt || "Silken Knot"} className="h-full w-full object-contain" />
              </div>
              <h2 id={titleId} className="text-center text-[1.75rem] font-medium leading-none tracking-tight text-[#2c2926] md:text-[2.35rem]">
                A little something
              </h2>
              <p className="mt-2.5 text-center text-sm text-[#6f675d] md:mt-3 md:text-[15px]">
                {showPrize ? "Your welcome offer is ready." : "Reveal below to see what we set aside for you."}
              </p>

              <div className="relative mt-5 w-full max-w-[320px] md:mt-6">
                <div className="flex h-[120px] flex-col items-center justify-center rounded-2xl border border-[#e3dbd1] bg-white px-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] md:h-[148px]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#8a7350]">Welcome offer</p>
                  <p className="mt-2 text-2xl font-medium text-[#2c2926]">{PRIZE_LABEL}</p>
                  <p className="mt-1 rounded-md bg-[#efeae3] px-3 py-1 text-sm tracking-[0.18em] text-[#5c564e]">{PRIZE_CODE}</p>
                </div>

                {!reduced && phase === "open" ? (
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 h-full w-full cursor-crosshair touch-none rounded-2xl"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    aria-label="Scratch to reveal your offer"
                  />
                ) : null}
              </div>

              {phase === "open" && !reduced ? (
                <button
                  type="button"
                  onClick={revealNow}
                  className="mt-3 text-xs text-[#8a7350] underline-offset-2 hover:underline"
                >
                  Or tap to reveal
                  {scratched > 0.08 ? ` · ${Math.round(scratched * 100)}%` : ""}
                </button>
              ) : null}

              {reduced && phase === "open" ? (
                <button
                  type="button"
                  onClick={revealNow}
                  className="mt-6 h-12 w-full max-w-[320px] rounded-xl bg-[#CBAC7C] text-sm font-medium text-white transition hover:bg-[#B39668]"
                >
                  Reveal offer
                </button>
              ) : null}

              {(phase === "revealed" || phase === "claimed") && (
                <button
                  type="button"
                  onClick={claim}
                  disabled={phase === "claimed"}
                  className="mt-6 h-12 w-full max-w-[320px] rounded-xl bg-[#CBAC7C] text-sm font-medium text-white transition hover:bg-[#B39668] disabled:opacity-70"
                >
                  {phase === "claimed" ? "Claimed" : "Claim offer"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
