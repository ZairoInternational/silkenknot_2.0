"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Heart, Search, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { Media, useDialog } from "@/components/ui";

const ease = [0.76, 0, 0.24, 1] as const;

export function SearchOverlay() {
  const store = useStore();
  const [query, setQuery] = useState("");
  const closeSearch = store.closeSearch;
  const close = useCallback(() => {
    setQuery("");
    closeSearch();
  }, [closeSearch]);
  const ref = useDialog(store.searchOpen, close);

  const popular = store.activeProducts.filter((product) => product.bestseller).slice(0, 4);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 1) return [];
    return store.activeProducts
      .filter((product) =>
        [product.name, product.type, product.scent, product.shortDescription, product.categoryId]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 5);
  }, [query, store.activeProducts]);

  return (
    <AnimatePresence>
      {store.searchOpen ? (
        <div ref={ref} className="pointer-events-none absolute inset-0 z-30">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="pointer-events-auto absolute left-1/2 top-1/2 z-30 w-1/2"
            initial={{ x: "-50%", y: "46vh", opacity: 0 }}
            animate={{ x: "-50%", y: "-1.5rem", opacity: 1 }}
            exit={{ x: "-50%", y: "28vh", opacity: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <div className="search-field flex h-12 items-center gap-3 rounded-full border border-black/15 bg-white px-4 text-ink shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]">
              <Search size={18} strokeWidth={1.6} className="shrink-0 text-ink/70" />
              <input
                id="ritual-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search body butter, soap, candle…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-mute focus-visible:outline-none"
                autoFocus
              />
              <button
                type="button"
                aria-label="Close search"
                onClick={close}
                className="group/close inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/10 text-current transition-colors duration-300 hover:bg-black/18 focus-visible:outline-none"
              >
                <X size={16} strokeWidth={1.6} className="transition-transform duration-300 group-hover/close:rotate-90" />
              </button>
            </div>

            <div className="search-scroll mt-2 flex h-[calc(100svh-var(--announce-h)-var(--nav-h)-1.25rem)] flex-col overflow-y-auto rounded-2xl border border-black/10 bg-white text-ink shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]">
              {query.trim() ? (
                <ul>
                  {results.map((product) => (
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
                  ))}
                  {results.length === 0 ? <li className="px-4 py-4 text-sm text-mute">Nothing matches that yet.</li> : null}
                </ul>
              ) : (
                <div className="flex min-h-full flex-1 flex-col gap-5 p-4">
                  <div className="shrink-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mute">Popular search</p>
                    <ul className="mt-3 space-y-2">
                      {store.recentSearches.length === 0 ? (
                        <li className="text-sm text-mute">Searches you make will rest here.</li>
                      ) : null}
                      {store.recentSearches.map((term) => (
                        <li key={term}>
                          <button type="button" className="text-left text-sm" onClick={() => setQuery(term)}>
                            {term}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mute">Categories</p>
                    <ul className="mt-3 grid grid-cols-2 gap-3">
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
                    <ul className="mt-3 grid grid-cols-2 gap-3">
                      {popular.map((product) => (
                        <li key={product.id}>
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
                            <button
                              type="button"
                              aria-label={store.isWished(product.id) ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
                              aria-pressed={store.isWished(product.id)}
                              onClick={() => store.toggleWishlist(product.id)}
                              className="inline-flex shrink-0 p-1"
                            >
                              <Heart
                                size={16}
                                className={store.isWished(product.id) ? "fill-current" : ""}
                              />
                            </button>
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
