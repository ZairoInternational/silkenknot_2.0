"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** Slim top progress bar on in-app navigations — no full-screen spinner. */
export function RoutePending() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    setVisible(false);
  }, [pathname]);

  useEffect(() => {
    function start(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setVisible(true), 180);
    }
    document.addEventListener("click", start);
    return () => {
      document.removeEventListener("click", start);
      window.clearTimeout(timer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5 overflow-hidden bg-transparent"
      role="progressbar"
      aria-label="Loading page"
      aria-busy="true"
    >
      <div className="route-pending-bar h-full w-1/3 bg-ink" />
    </div>
  );
}
