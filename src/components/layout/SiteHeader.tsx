"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Flame,
  Gift,
  Heart,
  Leaf,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  User,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/ui";
import { itemCount } from "@/lib/format";
import { useSiteMedia } from "@/lib/site-media/client";
import { useStore } from "@/lib/store";
import { Media, ease, usePrefersReducedMotion } from "@/components/ui";
import { LogoutConfirm } from "@/components/account/LogoutConfirm";
import { AccountDrawer } from "@/components/layout/AccountDrawer";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { useHeroNav } from "@/lib/hero-nav";
import { DEFAULT_ANNOUNCEMENTS, type AnnouncementIcon, type AnnouncementNote } from "@/lib/announcements/content";
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

const announcementIcons: Record<AnnouncementIcon, LucideIcon> = {
  sparkles: Sparkles,
  truck: Truck,
  gift: Gift,
  leaf: Leaf,
  flame: Flame,
};

function toHeaderNotes(notes: AnnouncementNote[]) {
  return notes.map((note) => ({
    text: note.text,
    href: note.href,
    icon: announcementIcons[note.icon] || Sparkles,
  }));
}

const defaultNotes = toHeaderNotes(DEFAULT_ANNOUNCEMENTS.notes.filter((note) => note.active));

const searchHints = [
  "Search for body butter",
  "Search for sugar scrub",
  "Search for bath salts",
  "Search for soap",
  "Search for candles",
];

function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Silken Knot home"
      className={`inline-flex items-center ${className}`}
    >
      <BrandLogo placement="header" decorative wordmarkClassName="font-serif text-xl md:text-2xl" />
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const home = pathname === "/";
  const shop = pathname === "/shop" || pathname.startsWith("/shop/");
  const store = useStore();
  const announceRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [notes, setNotes] = useState(defaultNotes);
  const [note, setNote] = useState(0);
  const [hint, setHint] = useState(0);
  const noteDirection = useRef(1);
  const [announceOpen, setAnnounceOpen] = useState(true);
  const [mega, setMega] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/announcements")
      .then((response) => response.json())
      .then((body) => {
        if (cancelled || !Array.isArray(body.notes)) return;
        const next = toHeaderNotes(body.notes as AnnouncementNote[]);
        if (!next.length) {
          setAnnounceOpen(false);
          document.documentElement.dataset.announce = "off";
          document.documentElement.style.setProperty("--announce-h", "0px");
          setNotes([]);
          return;
        }
        setNotes(next);
        setNote(0);
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [narrow, setNarrow] = useState(false);
  const [bar, setBar] = useState({
    hidden: false,
    solid: !home,
    top: 35,
  });

  useEffect(() => {
    store.closeAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (document.documentElement.dataset.announce === "off")
      setAnnounceOpen(false);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const apply = () => setNarrow(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const showNote = (step: number) => {
    if (!notes.length) return;
    noteDirection.current = step;
    setNote((index) => (index + step + notes.length) % notes.length);
  };

  useEffect(() => {
    if (!announceOpen || notes.length < 2) return;
    const timer = window.setInterval(() => showNote(1), 4200);
    return () => window.clearInterval(timer);
  }, [announceOpen, notes.length]);

  useEffect(() => {
    const timer = window.setInterval(() => setHint((index) => (index + 1) % searchHints.length), 2600);
    return () => window.clearInterval(timer);
  }, []);

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

  const heroNav = useHeroNav();
  const onHero = home && !bar.solid;
  const tone = onHero && heroNav === "white" ? "text-white" : "text-ink";
  // Solid bar keeps the usual ink chips. On the home transparent hero only,
  // right-side icons stay on that same ink chip instead of flipping to white.
  const iconButton =
    home || !onHero
      ? "bg-black/10 text-ink hover:bg-black/18"
      : "bg-white/15 text-white hover:bg-white/25";
  const currentNote = notes[note] || notes[0];
  const NoteIcon = currentNote?.icon || Sparkles;

  return (
    <>
      <AnimatePresence initial={false}>
        {announceOpen && currentNote ? (
          <motion.div
            ref={announceRef}
            className="announcement relative z-55 overflow-hidden bg-black text-white"
            initial={false}
            animate={{ height: narrow ? 52 : 35, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            <div className="relative flex h-full items-center justify-center px-10">
              <motion.span
                key={`sheen-${note}`}
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                initial={reduced ? false : { x: "-30vw" }}
                animate={reduced ? undefined : { x: "110vw" }}
                transition={{ duration: 0.85, ease: "easeOut" }}
              />
              <div className="relative z-10 flex h-full w-[min(88vw,420px)] items-center">
                <div className="relative h-full w-full overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={currentNote.text}
                      className="absolute inset-0 flex items-center justify-center"
                      initial={
                        reduced
                          ? false
                          : {
                              y: noteDirection.current > 0 ? 16 : -16,
                              opacity: 0,
                            }
                      }
                      animate={{ y: 0, opacity: 1 }}
                      exit={
                        reduced
                          ? undefined
                          : {
                              y: noteDirection.current > 0 ? -16 : 16,
                              opacity: 0,
                            }
                      }
                      transition={{ duration: reduced ? 0 : 0.38, ease }}
                    >
                      <Link
                        href={currentNote.href}
                        className="inline-flex items-center gap-2 whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.08em]"
                      >
                        <NoteIcon
                          size={13}
                          strokeWidth={1.75}
                          className="shrink-0 text-[#f0c9a0]"
                          aria-hidden
                        />
                        {currentNote.text}
                      </Link>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
              <button
                type="button"
                className="group/close absolute right-1 inline-flex h-6 w-6 items-center justify-center bg-white/10 hover:bg-white/18 rounded-full"
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
                <X size={12} className="transition-transform duration-300 group-hover/close:rotate-90" />
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
          transition:
            "top 300ms ease-out, background-color 300ms ease-out, color 300ms ease-out",
        }}
        onMouseLeave={() => setMega(false)}
      >
        <div
          className={`pointer-events-auto relative mx-auto flex h-16 items-center border-b px-4 transition-colors duration-300 md:px-8 ${tone === "text-white" ? "border-white/45" : "border-black/10"}`}
        >
          <div className="relative z-20 flex min-w-0 items-center gap-5">
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

          <Logo className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" />

          <div className="relative z-20 ml-auto flex items-center gap-2">
            <button
              type="button"
              className={`group h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 ${shop ? "inline-flex" : "hidden md:inline-flex"} ${iconButton}`}
              aria-label="Search"
              onClick={store.openSearch}
            >
              <EscalatorIcon icon={Search} />
            </button>
            <button
              type="button"
              className={`group hidden h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 md:inline-flex ${iconButton}`}
              aria-label="Account"
              onClick={() => store.openAccount()}
            >
              <EscalatorIcon icon={User} />
            </button>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className={`group relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 ${iconButton}`}
            >
              <EscalatorIcon icon={Heart} />
              {store.wishlist.length > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-1.25 w-1.25 rounded-full bg-[#d21f2b]" />
              ) : null}
            </Link>
            <button
              type="button"
              className={`group relative hidden h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 md:inline-flex ${iconButton}`}
              aria-label="Bag"
              onClick={store.openCart}
            >
              <EscalatorIcon icon={ShoppingBag} />
              {itemCount(store.cart) > 0 ? (
                <span
                  key={itemCount(store.cart)}
                  className="cart-count absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#d21f2b] px-1 text-[10px] leading-none text-white"
                >
                  {itemCount(store.cart)}
                </span>
              ) : null}
            </button>
          </div>
        </div>
        {home && bar.solid ? (
          <div className="pointer-events-auto bg-white px-4 pb-3 pt-2 md:hidden">
            <label className="flex h-12 w-full items-center gap-3 rounded-lg border border-black/15 bg-white px-4">
              <Search
                size={18}
                strokeWidth={1.6}
                className="shrink-0 text-[#6f675d]"
              />
              <span className="relative min-w-0 flex-1">
                <input
                  readOnly
                  value=""
                  aria-label={searchHints[hint]}
                  onFocus={(event) => {
                    store.openSearch();
                    event.currentTarget.blur();
                  }}
                  className="h-10 w-full bg-transparent text-base outline-none"
                />
                <span className="pointer-events-none absolute inset-0 flex items-center overflow-hidden text-base text-[#8a8178]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={searchHints[hint]}
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: reduced ? 0 : 0.35 }}
                    >
                      {searchHints[hint]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>
            </label>
          </div>
        ) : null}
        <SearchOverlay />
        <MegaMenu open={mega} onClose={() => setMega(false)} />
      </header>
      <MobileMenu onAccount={() => store.openAccount()} />
      <AccountDrawer
        open={store.accountOpen}
        onClose={() => store.closeAccount()}
        returnTo={pathname}
      />
    </>
  );
}

function MegaMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const media = useSiteMedia();
  const previews: Record<string, string> = {
    "body-care": media.collectionBodyCare,
    "bath-soap": media.collectionBathSoap,
    aromatherapy: media.collectionAromatherapy,
    lifestyle: media.collectionLifestyle,
  };
  const [activeId, setActiveId] = useState(store.categories[0]?.id ?? "body-care");
  const active = store.categories.find((category) => category.id === activeId) ?? store.categories[0];
  const image = previews[activeId] ?? active?.image ?? media.collectionBodyCare;

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
                  onMouseEnter={() => setActiveId(category.id)}
                  onFocus={() => setActiveId(category.id)}
                  className={`text-sm ${category.id === activeId ? "text-mist-ink" : ""}`}
                >
                  {category.name}
                  <span className="mt-1 block text-xs text-mute">
                    {category.description}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href={active ? `/shop?category=${active.id}` : "/shop"}
              onClick={onClose}
              className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-[#e7dfd4]"
            >
              <Media key={image} src={image} alt={active?.name ?? ""} sizes="240px" className="object-contain" />
            </Link>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MobileMenu({ onAccount }: { onAccount: () => void }) {
  const store = useStore();
  const pathname = usePathname();
  const user = store.currentUser;
  const menuOpen = store.menuOpen;
  const closeMenu = store.closeMenu;
  const [confirmLogout, setConfirmLogout] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, closeMenu]);

  const row = "flex w-full items-center justify-between border-b border-line py-3.5 text-left text-[13px] uppercase tracking-[0.14em]";

  return (
    <AnimatePresence>
      {store.menuOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[60] bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={store.closeMenu}
          />
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-y-0 left-0 z-[70] flex w-[min(86vw,320px)] flex-col bg-paper text-ink shadow-[8px_0_30px_rgba(0,0,0,0.12)]"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.35, ease }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <Logo />
              <button
                type="button"
                aria-label="Close menu"
                onClick={store.closeMenu}
                className="inline-flex h-9 w-9 items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-5" aria-label="Mobile">
              {links.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={store.closeMenu}
                    className={row}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className={active ? "text-[#8a7350]" : ""}>{link.label}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#CBAC7C]" : "bg-transparent"}`} />
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-line px-5 pb-6 pt-2">
              <Link href="/wishlist" onClick={store.closeMenu} className={row}>
                <span className="inline-flex items-center gap-2">
                  <Heart size={16} strokeWidth={1.6} className="text-[#CBAC7C]" fill={store.wishlist.length > 0 ? "currentColor" : "none"} />
                  Wishlist
                </span>
                {store.wishlist.length > 0 ? <span className="text-[11px] tracking-normal text-[#8a7350]">{store.wishlist.length}</span> : null}
              </Link>
              {user && user.role !== "admin" ? (
                <Link href="/account" onClick={store.closeMenu} className={row}>
                  <span>Account</span>
                  <User size={16} strokeWidth={1.6} className="text-[#8a7350]" />
                </Link>
              ) : (
                <button type="button" onClick={onAccount} className={row}>
                  <span>Account</span>
                  <User size={16} strokeWidth={1.6} className="text-[#8a7350]" />
                </button>
              )}
              {user && user.role !== "admin" ? (
                <button
                  type="button"
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-full border border-[#e3dbd1] bg-white text-[11px] uppercase tracking-[0.16em] text-[#8a7350]"
                  onClick={() => setConfirmLogout(true)}
                >
                  Log out
                </button>
              ) : null}
            </div>
          </motion.div>
          <LogoutConfirm
            open={confirmLogout}
            onCancel={() => setConfirmLogout(false)}
            onConfirm={() => {
              setConfirmLogout(false);
              void store.logout();
              store.closeMenu();
            }}
          />
        </>
      ) : null}
    </AnimatePresence>
  );
}
