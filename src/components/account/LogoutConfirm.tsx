"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function LogoutConfirm({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-center px-5">
          <motion.button
            type="button"
            aria-label="Stay signed in"
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-note"
            className="relative w-full max-w-sm bg-paper px-6 py-7 text-ink"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <h2 id="logout-title" className="font-serif text-3xl">Sign out?</h2>
            <p id="logout-note" className="mt-3 text-sm text-mute">You’ll need a new code to sign in again.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" className="h-11 bg-[#CBAC7C] text-[11px] uppercase tracking-[0.14em] text-white hover:bg-[#B39668]" onClick={onCancel}>
                Stay
              </button>
              <button type="button" className="h-11 border border-line text-[11px] uppercase tracking-[0.14em]" onClick={onConfirm}>
                Sign out
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
