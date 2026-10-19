"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Loader2, Search, X } from "lucide-react";
import { Media, useDialog, WishlistButton } from "@/components/ui";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { searchProducts, SearchAbortError } from "@/lib/search/client";
import type { SearchProduct } from "@/lib/search/types";

const ease = [0.76, 0, 0.24, 1] as const;

/** Minimum characters before the search API is called. */
const MIN_QUERY_LENGTH = 2;
/** Debounce delay in ms before issuing a new request. */
const DEBOUNCE_MS = 250;
/** Maximum suggestions shown in the header overlay. */
const MAX_SUGGESTIONS = 5;

export function SearchOverlay() {
  const store = useStore();
  const [query, setQuery] = useState("");
  const closeSearch = store.closeSearch;

  const close = useCallback(() => {
    setQuery("");
    closeSearch();
  }, [closeSearch]);

  const ref = useDialog(store.searchOpen, close);

  // ── API state ──────────────────────────────────────────────────────────────
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  /** Monotonically increasing ID — the only response we accept is the latest. */
  const reqId = useRef(0);
  /** AbortController for the in-flight request. */
  const abortRef = useRef<AbortController | null>(null);

  // ── Popular products shown when query is empty ────────────────────────────
  const popular = store.activeProducts.filter((p) => p.bestseller).slice(0, 4);

  // ── Search effect — fires after DEBOUNCE_MS of quiet typing ──────────────
  useEffect(() => {
    const term = query.trim();

    if (term.length < MIN_QUERY_LENGTH) {
      // Clear results immediately; do not call the API.
      setResults([]);
      setLoading(false);
      setSearchError(false);
      return;
    }

    const id = ++reqId.current;

    const timer = window.setTimeout(() => {
      // Cancel the previous in-flight request.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setSearchError(false);

      searchProducts({ q: term, limit: MAX_SUGGESTIONS }, controller.signal)
        .then((data) => {
          if (reqId.current !== id) return; // stale response — ignore
          setResults(data.items);
          setLoading(false);
        })
        .catch((err) => {
          if (err instanceof SearchAbortError) return; // intentional cancel — no error shown
          if (reqId.current !== id) return;
          setLoading(false);
          setSearchError(true);
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      // Do NOT abort here — let the debounce timer cancel the previous request
      // when a new one starts. This avoids double-abort races.
    };
  }, [query]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ── Reset state when the overlay closes ──────────────────────────────────
  useEffect(() => {
    if (!store.searchOpen) {
      setResults([]);
      setLoading(false);
      setSearchError(false);
      reqId.current = 0;
    }
  }, [store.searchOpen]);

  const term = query.trim();
  const showResults = term.length >= MIN_QUERY_LENGTH;

  return (
    <AnimatePresence>
      {store.searchOpen ? (
        <div ref={ref} className="pointer-events-none absolute inset-0 z-30">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="pointer-events-auto absolute left-1/2 top-1/2 z-30 w-full px-3 md:w-1/2 md:px-0"
            initial={{ x: "-50%", y: "46vh", opacity: 0 }}
            animate={{ x: "-50%", y: "-1.5rem", opacity: 1 }}
            exit={{ x: "-50%", y: "28vh", opacity: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            {/* ── Search input ─────────────────────────────────────────── */}
            <div className="search-field flex h-12 items-center gap-3 rounded-full border border-black/15 bg-white px-4 text-ink shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]">
              <Search size={18} strokeWidth={1.6} className="shrink-0 text-ink/70" />
              <input
                id="ritual-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search body butter, soap, candle…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-mute focus-visible:outline-none"
                autoFocus
                aria-label="Search products"
                aria-autocomplete="list"
                aria-controls="search-suggestions"
                aria-expanded={showResults}
              />
              {loading ? (
                <Loader2
                  size={16}
                  strokeWidth={1.6}
                  className="shrink-0 animate-spin text-mute"
                  aria-label="Searching…"
                />
              ) : null}
              <button
                type="button"
                aria-label="Close search"
                onClick={close}
                className="group/close inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/10 text-current transition-colors duration-300 hover:bg-black/18 focus-visible:outline-none"
              >
                <X size={16} strokeWidth={1.6} className="transition-transform duration-300 group-hover/close:rotate-90" />
              </button>
            </div>

            {/* ── Results panel ─────────────────────────────────────────── */}
            <div className="search-scroll mt-2 flex h-[calc(100svh-var(--announce-h)-var(--nav-h)-1.25rem)] flex-col overflow-y-auto rounded-2xl border border-black/10 bg-white text-ink shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]">
              {showResults ? (
                /* ── Active query: show API results ───────────────────── */
                <ul id="search-suggestions" aria-label="Search suggestions">
                  {loading && results.length === 0 ? (
                    /* Skeleton rows while the first response loads */
                    Array.from({ length: 3 }, (_, i) => (
                      <li key={i} className="grid grid-cols-[44px_1fr] items-center gap-3 px-4 py-2.5">
                        <span className="relative block aspect-square animate-pulse rounded bg-[#eee8de]" />
                        <span className="space-y-2">
                          <span className="block h-4 w-3/4 animate-pulse rounded bg-[#eee8de]" />
                          <span className="block h-3 w-1/3 animate-pulse rounded bg-[#eee8de]" />
                        </span>
                      </li>
                    ))
                  ) : searchError ? (
                    <li className="px-4 py-6 text-center text-sm text-mute">
                      Search isn&apos;t available right now.{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          setSearchError(false);
                          setQuery((q) => q); // re-trigger the effect
                        }}
                      >
                        Try again
                      </button>
                    </li>
                  ) : results.length > 0 ? (
                    results.map((product) => (
                      <li key={product.id}>
                        <Link
                          href={`/products/${product.slug}`}
                          onClick={() => {
                            store.rememberSearch(query);
                            close();
                          }}
                          className="grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-2.5 hover:bg-black/5"
                        >
                          <span className="relative block aspect-square bg-cream">
                            <Media src={product.images[0]} alt="" sizes="44px" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm">{product.name}</span>
                            <span className="text-xs text-mute">{product.type}</span>
                          </span>
                          <span className="text-sm">{formatPrice(product.price)}</span>
                        </Link>
                      </li>
                    ))
                  ) : (
                    /* Zero results — only show after a successful (non-loading) response */
                    <li className="px-4 py-4 text-sm text-mute">Nothing matches that yet.</li>
                  )}
                </ul>
              ) : (
                /* ── Empty query: recent searches + categories + suggestions ── */
                <div className="flex min-h-full flex-1 flex-col gap-5 p-4">
                  <div className="hidden shrink-0 md:block">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mute">Popular search</p>
                    <ul className="mt-3 space-y-2">
                      {store.recentSearches.length === 0 ? (
                        <li className="text-sm text-mute">Searches you make will rest here.</li>
                      ) : null}
                      {store.recentSearches.map((term) => (
                        <li key={term}>
                          <button
                            type="button"
                            className="text-left text-sm"
                            onClick={() => setQuery(term)}
                          >
                            {term}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mute">Categories</p>
                    <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {store.categories.map((category) => (
                        <li key={category.id}>
                          <Link
                            href={`/shop?category=${category.id}`}
                            onClick={close}
                            className="group flex h-16 items-center gap-3 rounded-xl border border-line bg-white px-2 transition duration-300 hover:-translate-y-0.5 hover:border-ink hover:shadow-[0_12px_28px_-18px_rgba(0,0,0,0.55)]"
                          >
                            <span className="relative block size-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                              <Media src={category.image} alt={category.imageAlt} sizes="48px" className="object-cover" />
                            </span>
                            <span className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-1">
                              <span className="truncate font-serif text-lg leading-none">{category.name}</span>
                              <ArrowUpRight size={16} className="shrink-0 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mute">Suggested</p>
                    <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {popular.map((product, index) => (
                        <li key={product.id} className={index > 1 ? "hidden md:block" : undefined}>
                          <div className="group flex h-16 items-center gap-2 rounded-xl border border-line bg-white px-2 transition duration-300 hover:-translate-y-0.5 hover:border-ink hover:shadow-[0_12px_28px_-18px_rgba(0,0,0,0.55)]">
                            <Link
                              href={`/products/${product.slug}`}
                              onClick={close}
                              className="flex min-w-0 flex-1 items-center gap-3"
                            >
                              <span className="relative block size-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                                <Media src={product.images[0]} alt={product.name} sizes="48px" className="object-cover" />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate font-serif text-lg leading-none">{product.name}</span>
                                <span className="mt-1 block text-xs text-mute">{formatPrice(product.price)}</span>
                              </span>
                            </Link>
                            <WishlistButton productId={product.id} name={product.name} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <button
            type="button"
            aria-label="Close search"
            className="pointer-events-auto fixed inset-0 z-20 cursor-default bg-black/25 backdrop-blur-md"
            onClick={close}
          />
        </div>
      ) : null}
    </AnimatePresence>
  );
}
