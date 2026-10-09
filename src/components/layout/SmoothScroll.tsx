"use client";

import { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { useStore } from "@/lib/store";
import { usePrefersReducedMotion } from "@/components/ui";

const options = {
  autoRaf: true,
  lerp: 0.12,
  smoothWheel: true,
  syncTouch: true,
  syncTouchLerp: 0.14,
  touchInertiaExponent: 1.35,
  wheelMultiplier: 0.9,
  anchors: true,
  autoToggle: true,
  allowNestedScroll: true,
};

function ScrollLock() {
  const lenis = useLenis();
  const { cartOpen, searchOpen, menuOpen } = useStore();
  const locked = cartOpen || searchOpen || menuOpen;

  useEffect(() => {
    if (!lenis) return;
    if (locked) lenis.stop();
    else lenis.start();
  }, [lenis, locked]);

  return null;
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return children;

  return (
    <ReactLenis root options={options}>
      <ScrollLock />
      {children}
    </ReactLenis>
  );
}
