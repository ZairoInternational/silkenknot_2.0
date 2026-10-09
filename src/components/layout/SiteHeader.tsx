"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Gift,
  Leaf,
  Menu,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  User,
  X,
} from "lucide-react";
import { itemCount } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Mark, ease, usePrefersReducedMotion } from "@/components/ui";
import { AccountDrawer } from "@/components/layout/AccountDrawer";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import type { LucideIcon } from "lucide-react";

function EscalatorIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="relative block size-5 overflow-hidden">
      <span className="absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-full motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <Icon size={20} strokeWidth={1.6} />
      </span>
      <span
        aria-hidden
        className="absolute inset-0 flex translate-y-full items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0 motion-reduce:hidden"
      >
        <Icon size={20} strokeWidth={1.6} />
      </span>
    </span>
  );
}

const links = [
  { href: "/shop", label: "Shop", menu: true },
  { href: "/shop?category=body-care", label: "Body Care" },
  { href: "/shop?category=bath-soap", label: "Bath" },
  { href: "/shop?category=aromatherapy", label: "Wellness" },
  { href: "/about", label: "About" },
];

const notes = [
  { text: "New seasonal scents are here", href: "/shop?category=aromatherapy", icon: Sparkles },
  { text: "Free shipping on orders over ₹999", href: "/shipping", icon: Truck },
  { text: "Save 10% with code RITUAL10", href: "/shop", icon: Gift },
  { text: "Body butters for everyday skin", href: "/shop?category=body-care", icon: Leaf },
  { text: "14-day returns on unopened care", href: "/returns", icon: RotateCcw },
  { text: "Candles for the last hour of the day", href: "/shop?category=aromatherapy", icon: Flame },
];

function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-serif text-[1.55rem] leading-none tracking-tight ${className}`}
    >
      <Mark className="h-4 w-4" />
      Silk Knot
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const home = pathname === "/";
  const store = useStore();
  const announceRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [note, setNote] = useState(0);
  const noteDirection = useRef(1);
  const [announceOpen, setAnnounceOpen] = useState(true);
  const [mega, setMega] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [bar, setBar] = useState({
    hidden: false,
    solid: !home,
    top: 35,
  });

  useEffect(() => {
    if (document.documentElement.dataset.announce === "off")
      setAnnounceOpen(false);
  }, []);

  const showNote = (step: number) => {
    noteDirection.current = step;
    setNote((index) => (index + step + notes.length) % notes.length);
  };

  useEffect(() => {
    if (!announceOpen) return;
    const timer = window.setInterval(() => showNote(1), 4200);
    return () => window.clearInterval(timer);
  }, [announceOpen]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let frame = 0;
    let lastY = window.scrollY;
    let hidden = false;
    let solid = !home;
    let top = announceRef.current?.offsetHeight || 35;
    let intent = 0;

    const paint = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      const announceH = announceOpen ? Math.max(announceRef.current?.offsetHeight ?? 0, 35) : 0;
      const atTop = y <= 8;
      if ((intent > 0 && delta < 0) || (intent < 0 && delta > 0)) intent = 0;
      intent += delta;
      if (atTop || store.menuOpen || mega) hidden = false;
      else if (intent > 8) hidden = true;
      else if (intent < -8) hidden = false;

      const nextTop = hidden ? -120 : atTop ? announceH : 0;
      const nextSolid = !home || !atTop || mega;
      if (nextTop === top && nextSolid === solid) return;
      solid = nextSolid;
      top = nextTop;
      setBar({ hidden, solid: nextSolid, top: nextTop });
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(paint);
    };
    paint();
    const observer = new ResizeObserver(paint);
    if (announceRef.current) observer.observe(announceRef.current);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [announceOpen, home, mega, store.menuOpen]);

  useEffect(() => {
    if (!mega) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMega(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mega]);

  const tone = "text-ink";
  const iconButton = bar.solid
    ? "bg-black/10 text-ink hover:bg-black/18"
    : "bg-white/15 text-white hover:bg-white/25";
  const currentNote = notes[note];
  const NoteIcon = currentNote.icon;

  return (
    <>
      <AnimatePresence initial={false}>
        {announceOpen ? (
          <motion.div
            ref={announceRef}
            className="announcement relative z-[55] overflow-hidden bg-black text-white"
            initial={false}
            animate={{ height: 35, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            <div className="relative flex h-[35px] items-center justify-center px-10">
              <motion.span
                key={`sheen-${note}`}
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                initial={reduced ? false : { x: "-30vw" }}
                animate={reduced ? undefined : { x: "110vw" }}
                transition={{ duration: 0.85, ease: "easeOut" }}
              />
              <div className="relative z-10 flex items-center gap-3">
                <button
                  type="button"
                  className="relative z-20 inline-flex h-8 w-8 items-center justify-center"
                  aria-label="Previous announcement"
                  onClick={() => showNote(-1)}
                >
                  <ChevronLeft size={13} />
                </button>
                <div className="relative h-[35px] w-[min(72vw,420px)] overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={currentNote.text}
                      className="absolute inset-0 flex items-center justify-center"
                      initial={reduced ? false : { y: noteDirection.current > 0 ? 16 : -16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={reduced ? undefined : { y: noteDirection.current > 0 ? -16 : 16, opacity: 0 }}
                      transition={{ duration: reduced ? 0 : 0.38, ease }}
                    >
                      <Link
                        href={currentNote.href}
                        className="inline-flex items-center gap-2 whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.08em]"
                      >
                        <NoteIcon size={13} strokeWidth={1.75} className="shrink-0 text-[#f0c9a0]" aria-hidden />
                        {currentNote.text}
                      </Link>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <button
                  type="button"
                  className="relative z-20 inline-flex h-8 w-8 items-center justify-center"
                  aria-label="Next announcement"
                  onClick={() => showNote(1)}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
              <button
                type="button"
                className="absolute right-1 inline-flex h-6 w-6 items-center justify-center"
                aria-label="Dismiss announcement"
                onClick={() => {
                  setAnnounceOpen(false);
                  document.documentElement.dataset.announce = "off";
                  document.documentElement.style.setProperty(
                    "--announce-h",
                    "0px",
                  );
                  sessionStorage.setItem("silkknot.announce", "off");
                }}
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {mega ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-md"
          onClick={() => setMega(false)}
        />
      ) : null}

      <header
        ref={navRef}
        className={`pointer-events-none fixed inset-x-0 z-50 ${tone}`}
        style={{
          top: bar.top,
          backgroundColor: bar.solid ? "rgba(255,255,255,0.96)" : "transparent",
          transition: "top 300ms ease-out, background-color 300ms ease-out, color 300ms ease-out",
        }}
        onMouseLeave={() => setMega(false)}
      >
        <div className="pointer-events-auto relative mx-auto flex h-16 items-center border-b border-black/10 px-4 transition-colors duration-300 md:px-8">
          <div className="relative z-20 flex min-w-0 items-center gap-5">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center md:hidden"
              aria-label="Open menu"
              aria-expanded={store.menuOpen}
              onClick={store.openMenu}
            >
              <Menu size={18} strokeWidth={1.4} />
            </button>
            <nav aria-label="Primary" className="hidden md:block">
              <ul className="flex items-center gap-8 xl:gap-10">
                {links.map((link) => (
                  <li
                    key={link.label}
                    onMouseEnter={() => setMega(Boolean(link.menu))}
                  >
                    {link.menu ? (
                      <button
                        type="button"
                        className="relative text-[14px] font-normal uppercase tracking-[0.5px] after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100"
                        aria-expanded={mega}
                        onClick={() => setMega((open) => !open)}
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link
                        href={link.href}
                        className="relative text-[14px] font-normal uppercase tracking-[0.5px] after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100"
                        onClick={() => setMega(false)}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <Logo className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

          <div className="relative z-20 ml-auto flex items-center gap-2">
            <button
              type="button"
              className={`group inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 ${iconButton}`}
              aria-label="Search"
              onClick={store.openSearch}
            >
              <EscalatorIcon icon={Search} />
            </button>
            <button
              type="button"
              className={`group hidden h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 md:inline-flex ${iconButton}`}
              aria-label="Account"
              onClick={() => setAccountOpen(true)}
            >
              <EscalatorIcon icon={User} />
            </button>
            <button
              type="button"
              className={`group relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 ${iconButton}`}
              aria-label="Bag"
              onClick={store.openCart}
            >
              <EscalatorIcon icon={ShoppingBag} />
              {itemCount(store.cart) > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-1.25 w-1.25 rounded-full bg-[#d21f2b]" />
              ) : null}
            </button>
          </div>
        </div>
        <SearchOverlay />
        <MegaMenu open={mega} onClose={() => setMega(false)} />
      </header>
      <MobileMenu
        onAccount={() => {
          store.closeMenu();
          setAccountOpen(true);
        }}
      />
      <AccountDrawer open={accountOpen} onClose={() => setAccountOpen(false)} />
    </>
  );
}

function MegaMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="pointer-events-auto hidden bg-white text-ink shadow-[0_24px_40px_-28px_rgba(0,0,0,0.35)] md:block"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="mx-auto grid max-w-[1200px] grid-cols-[180px_1fr_220px] gap-10 px-8 py-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-mute">
                Shop
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link href="/shop" onClick={onClose}>
                    All products
                  </Link>
                </li>
                <li>
                  <Link href="/shop?sort=bestselling" onClick={onClose}>
                    Best sellers
                  </Link>
                </li>
                <li>
                  <Link href="/shop?sort=newest" onClick={onClose}>
                    New arrivals
                  </Link>
                </li>
                <li>
                  <Link href="/wishlist" onClick={onClose}>
                    Wishlist
                  </Link>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {store.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/shop?category=${category.id}`}
                  onClick={onClose}
                  className="text-sm"
                >
                  {category.name}
                  <span className="mt-1 block text-xs text-mute">
                    {category.description}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/shop?category=body-care"
              onClick={onClose}
              className="relative block aspect-[4/5] overflow-hidden bg-cream"
            >
              <img
                src="/silknknot/body_butter.jpg"
                alt=""
                className="h-full w-full object-contain"
              />
            </Link>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MobileMenu({ onAccount }: { onAccount: () => void }) {
  const store = useStore();
  useEffect(() => {
    if (!store.menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") store.closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [store.menuOpen, store.closeMenu]);
  return (
    <AnimatePresence>
      {store.menuOpen ? (
        <motion.div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-[60] flex flex-col bg-white px-6 pb-10 pt-5 text-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <Logo />
            <button
              type="button"
              aria-label="Close menu"
              onClick={store.closeMenu}
              className="inline-flex h-10 w-10 items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
          <nav className="mt-16 flex flex-1 flex-col gap-5" aria-label="Mobile">
            {links.map((link, index) => (
              <motion.div
                key={link.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index, duration: 0.35, ease }}
              >
                <Link
                  href={link.href}
                  onClick={store.closeMenu}
                  className="font-serif text-5xl"
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </nav>
          <div className="flex gap-6 text-[11px] uppercase tracking-[0.18em]">
            <button type="button" onClick={onAccount}>
              Account
            </button>
            <Link href="/wishlist" onClick={store.closeMenu}>
              Wishlist
            </Link>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
