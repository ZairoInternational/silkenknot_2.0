"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { BottomSheet, Media, WishlistButton } from "@/components/ui";
import { seedCategories, seedProducts } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

const PAGE_SIZE = 8;

const SORT_OPTIONS = [
  ["featured", "Featured"],
  ["newest", "New arrivals"],
  ["rating", "Top rated"],
  ["price-low", "Price, low to high"],
  ["price-high", "Price, high to low"],
] as const;

export function ShopCatalog() {
  const store = useStore();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const catalog = store.activeProducts.length ? store.activeProducts : seedProducts.filter((product) => product.active);
  const categories = store.categories.length ? store.categories : seedCategories;

  const priceFloor = catalog.reduce((min, product) => Math.min(min, product.price), catalog[0]?.price ?? 0);
  const priceCeil = catalog.reduce((max, product) => Math.max(max, product.price), catalog[0]?.price ?? 0);

  const category = params.get("category") ?? "all";
  const sort = normalizeSort(params.get("sort"));
  const minPrice = params.get("min") ? Math.max(priceFloor, Number(params.get("min"))) : priceFloor;
  const maxPrice = params.get("max") ? Math.min(priceCeil, Number(params.get("max"))) : priceCeil;
  const minRating = Number(params.get("rating") || 0);
  const bestseller = params.get("bestseller") === "1";
  const types = (params.get("type") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const urlQuery = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page") || 1));

  const [draft, setDraft] = useState(urlQuery);
  const [seenQuery, setSeenQuery] = useState(urlQuery);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [desktopSortOpen, setDesktopSortOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  if (urlQuery !== seenQuery) {
    setSeenQuery(urlQuery);
    setDraft(urlQuery);
  }

  function write(next: Record<string, string | undefined>) {
    const search = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (!value) search.delete(key);
      else search.set(key, value);
    });
    const qs = search.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (!desktopSortOpen) return;
    const close = (event: MouseEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) setDesktopSortOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDesktopSortOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [desktopSortOpen]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const current = params.get("q") ?? "";
      if (draft === current) return;
      write({ q: draft.trim() || undefined, page: undefined });
    }, 250);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const suggestions = useMemo(() => {
    const query = draft.trim().toLowerCase();
    if (!query) return [];
    return catalog
      .filter((product) => `${product.name} ${product.type} ${product.scent} ${product.shortDescription}`.toLowerCase().includes(query))
      .slice(0, 6);
  }, [catalog, draft]);

  const filtered = useMemo(() => {
    const query = urlQuery.trim().toLowerCase();
    let list = catalog.filter((product) => {
      if (category !== "all" && product.categoryId !== category) return false;
      if (product.price < minPrice || product.price > maxPrice) return false;
      if (minRating && product.rating < minRating) return false;
      if (bestseller && !product.bestseller) return false;
      if (types.length && !types.includes(product.type)) return false;
      if (query) {
        const haystack = `${product.name} ${product.type} ${product.scent} ${product.shortDescription}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => compare(a, b, sort));
    return list;
  }, [catalog, category, minPrice, maxPrice, minRating, bestseller, types, urlQuery, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const categoryName = categories.find((item) => item.id === category)?.name;
  const priceActive = minPrice > priceFloor || maxPrice < priceCeil;
  const ratingChoice = minRating >= 4 ? 4 : minRating >= 3 ? 3 : 0;
  const activeCount = [category !== "all", priceActive, minRating > 0, bestseller, types.length > 0, Boolean(urlQuery.trim())].filter(Boolean).length;

  const chips = (
    <ActiveFilters
      categoryName={category !== "all" ? categoryName : undefined}
      priceLabel={priceActive ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}` : undefined}
      ratingLabel={ratingChoice ? `${ratingChoice}★ and above` : undefined}
      bestseller={bestseller}
      types={types}
      query={urlQuery.trim()}
      onClear={(key) => {
        if (key === "category") write({ category: undefined, page: undefined });
        if (key === "max") write({ min: undefined, max: undefined, page: undefined });
        if (key === "rating") write({ rating: undefined, page: undefined });
        if (key === "bestseller") write({ bestseller: undefined, page: undefined });
        if (key === "type") write({ type: undefined, page: undefined });
        if (key === "q") {
          setDraft("");
          write({ q: undefined, page: undefined });
        }
      }}
    />
  );

  const fields = (
    <FilterFields
      categories={categories}
      catalog={catalog}
      category={category}
      priceFloor={priceFloor}
      priceCeil={priceCeil}
      minPrice={Math.min(minPrice, maxPrice)}
      maxPrice={Math.max(minPrice, maxPrice)}
      ratingChoice={ratingChoice}
      bestseller={bestseller}
      onCategory={(id) => write({ category: id === "all" ? undefined : id, page: undefined })}
      onPrice={(low, high) =>
        write({
          min: low <= priceFloor ? undefined : String(low),
          max: high >= priceCeil ? undefined : String(high),
          page: undefined,
        })
      }
      onRating={(value) => write({ rating: value ? String(value) : undefined, page: undefined })}
      onBestseller={(value) => write({ bestseller: value ? "1" : undefined, page: undefined })}
    />
  );

  const clearAll = () => {
    setDraft("");
    write({
      category: undefined,
      type: undefined,
      min: undefined,
      max: undefined,
      rating: undefined,
      bestseller: undefined,
      q: undefined,
      sort: undefined,
      page: undefined,
    });
  };

  return (
    <div className="bg-[#f6f3ee] pt-[calc(var(--nav-h)+var(--announce-h))] text-[#2c2926]">
      <section className="grid md:min-h-[440px] md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative order-first min-h-[240px] md:order-last md:min-h-full">
          <Media src="/silknknot/collection-body-care.jpg" alt="Silken Knot body care" sizes="(min-width: 768px) 55vw, 100vw" className="object-cover" />
        </div>
        <div className="flex flex-col justify-center px-6 py-8 md:px-12 md:py-16 lg:px-16">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8a7350] md:text-sm">Shop our collections</p>
          <h1 className="mt-3 text-[2.15rem] font-medium leading-[1.12] md:text-5xl">Natural care for your everyday rituals</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-[#4e4943] md:text-lg">
            From nourishing body butters to calming candles, find everything you need for a little more self-care in your day.
          </p>
          <a href="#products" className="mt-6 inline-flex w-fit items-center rounded-full bg-[#CBAC7C] px-6 py-3 text-base text-white transition-colors hover:bg-[#B39668] md:text-sm">
            Explore all products
          </a>
        </div>
      </section>

      <section id="products" className="scroll-mt-28 px-5 py-8 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10 lg:px-10 lg:py-12">
        <aside className="hidden lg:block">{fields}</aside>
        <div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8a7350] md:text-sm">The Silken Knot collection</p>
              <h2 className="mt-2 text-3xl font-medium md:text-4xl">{category === "all" ? "All products" : categoryName}</h2>
              <p className="mt-2 text-base text-[#4e4943] md:text-lg">Little luxuries. Everyday moments.</p>
            </div>
            <p className="text-base text-[#4e4943]">{filtered.length} products</p>
          </div>

          <div className="mt-5 hidden gap-3 lg:flex lg:flex-row lg:items-start">
            <div className="relative min-w-0 flex-1">
              <label className="search-field flex h-16 min-w-0 items-center gap-3 rounded-full border border-black/15 bg-white px-8 lg:h-12 lg:gap-2 lg:px-4">
                <Search size={18} className="shrink-0 text-[#6f675d]" />
                <input
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setSuggestOpen(true);
                  }}
                  onFocus={() => setSuggestOpen(true)}
                  onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
                  placeholder="Search the collection"
                  aria-label="Search products"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={suggestOpen && draft.trim().length > 0}
                  aria-controls="shop-suggestions"
                  autoComplete="off"
                  className="w-full min-w-0 bg-transparent text-base text-[#2c2926] outline-none placeholder:text-[#8a8178]"
                />
                {draft ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setDraft("");
                      setSuggestOpen(false);
                    }}
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </label>
              {suggestOpen && draft.trim() ? (
                <ul id="shop-suggestions" className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 max-h-80 overflow-y-auto rounded-2xl border border-black/10 bg-white py-2 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]">
                  {suggestions.length ? (
                    suggestions.map((product) => (
                      <li key={product.id}>
                        <Link
                          href={`/products/${product.slug}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            store.rememberSearch(draft.trim());
                            setSuggestOpen(false);
                          }}
                          className="grid grid-cols-[52px_1fr] items-center gap-3 px-4 py-2.5 hover:bg-black/5"
                        >
                          <span className="relative block aspect-square overflow-hidden rounded-lg bg-[#eee8de]">
                            <Media src={product.images[0]} alt="" sizes="52px" className="object-cover" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-base text-[#2c2926]">{product.name}</span>
                            <span className="mt-0.5 block truncate text-sm capitalize text-[#6f675d]">{product.type}</span>
                          </span>
                        </Link>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-4 text-base text-[#6f675d]">Nothing matches that yet.</li>
                  )}
                </ul>
              ) : null}
            </div>
            <div ref={sortMenuRef} className="relative hidden lg:block">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={desktopSortOpen}
                onClick={() => setDesktopSortOpen((open) => !open)}
                className="flex h-12 min-w-[240px] items-center justify-between gap-4 rounded-full border border-[#e3dbd1] bg-white px-4 text-base text-[#2c2926]"
              >
                <span>
                  <span className="text-[#8a7350]">Sort</span>
                  <span className="mx-2 text-[#e3dbd1]">/</span>
                  {SORT_OPTIONS.find(([value]) => value === sort)?.[1] ?? "Featured"}
                </span>
                <ChevronDown size={16} className={`text-[#8a7350] transition ${desktopSortOpen ? "rotate-180" : ""}`} />
              </button>
              {desktopSortOpen ? (
                <ul role="listbox" aria-label="Sort products" className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-full overflow-hidden rounded-2xl border border-[#e3dbd1] bg-white py-2 shadow-[0_18px_50px_-24px_rgba(44,41,38,0.35)]">
                  {SORT_OPTIONS.map(([value, label]) => {
                    const selected = sort === value;
                    return (
                      <li key={value}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            write({ sort: value === "featured" ? undefined : value, page: undefined });
                            setDesktopSortOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${selected ? "bg-[#fbf9f6] text-[#2c2926]" : "text-[#4e4943] hover:bg-[#f6f3ee]"}`}
                        >
                          {label}
                          <span className={`size-2.5 rounded-full ${selected ? "bg-[#CBAC7C]" : "border border-[#e3dbd1]"}`} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setSortOpen(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-black/15 bg-white text-base"
            >
              <ArrowUpDown size={16} />
              Sort
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-black/15 bg-white text-base"
            >
              <SlidersHorizontal size={16} />
              Filter
              {activeCount > 0 ? <span className="grid size-5 place-items-center rounded-full border border-[#e3dbd1] bg-white text-xs text-[#2c2926]">{activeCount}</span> : null}
            </button>
          </div>
          {activeCount > 0 ? <div className="mt-3 lg:hidden">{chips}</div> : null}

          {visible.length ? (
            <div className="mt-6 grid grid-cols-2 items-stretch gap-x-3 gap-y-8 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-6 border border-[#e6e0d6] px-6 py-16 text-center">
              <h3 className="text-2xl font-medium">No products found</h3>
              <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-[#4e4943]">Try a different search or clear a filter.</p>
              <button type="button" onClick={clearAll} className="mt-6 rounded-full bg-[#CBAC7C] px-6 py-3 text-base text-white hover:bg-[#B39668]">
                Clear filters
              </button>
            </div>
          )}

          {pages > 1 ? (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <PageButton disabled={safePage === 1} onClick={() => write({ page: safePage - 1 <= 1 ? undefined : String(safePage - 1) })} label="Previous page">←</PageButton>
              {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
                <PageButton key={number} current={number === safePage} onClick={() => write({ page: number <= 1 ? undefined : String(number) })} label={`Page ${number}`}>
                  {number}
                </PageButton>
              ))}
              <PageButton disabled={safePage === pages} onClick={() => write({ page: String(safePage + 1) })} label="Next page">→</PageButton>
            </div>
          ) : null}
        </div>
      </section>

      <BottomSheet open={sortOpen} onClose={() => setSortOpen(false)} label="Sort">
        <div className="flex items-center justify-between border-b border-[#e6e0d6] px-5 py-4">
          <h2 className="text-2xl font-medium">Sort</h2>
          <button type="button" onClick={() => setSortOpen(false)} className="text-base">
            Close
          </button>
        </div>
        <div className="flex flex-col gap-1 px-3 py-3">
          {SORT_OPTIONS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={sort === value}
              onClick={() => {
                write({ sort: value === "featured" ? undefined : value, page: undefined });
                setSortOpen(false);
              }}
              className={`flex min-h-12 items-center justify-between rounded-xl px-3 text-left text-base ${sort === value ? "bg-[#f3eadc]" : ""}`}
            >
              {label}
              <span className={`size-2.5 rounded-full ${sort === value ? "bg-[#CBAC7C]" : "border border-[#c8bfb4]"}`} />
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} label="Filters" tall>
        <div className="flex items-center justify-between border-b border-[#e6e0d6] px-5 py-4">
          <h2 className="text-2xl font-medium">Filters</h2>
          <button type="button" onClick={() => setFiltersOpen(false)} className="text-base">
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">
          {activeCount > 0 ? (
            <div className="mb-6">
              <p className="text-sm font-medium text-[#4e4943]">Applied</p>
              <div className="mt-3">{chips}</div>
            </div>
          ) : (
            <p className="mb-6 text-base text-[#4e4943]">No filters applied yet.</p>
          )}
          {fields}
        </div>
        <div className="flex gap-3 border-t border-[#e6e0d6] px-5 py-4">
          <button type="button" onClick={clearAll} className="h-12 flex-1 rounded-full border border-[#e3dbd1] bg-white text-base">
            Clear
          </button>
          <button type="button" onClick={() => setFiltersOpen(false)} className="h-12 flex-[1.4] rounded-full bg-[#CBAC7C] text-base text-white hover:bg-[#B39668]">
            Show {filtered.length} products
          </button>
        </div>
      </BottomSheet>

      <section className="grid bg-[#efeae3] md:grid-cols-2">
        <div className="relative min-h-[220px] md:min-h-[320px]">
          <Media src="/silknknot/collection-lifestyle-wide.jpg" alt="" sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
        <div className="flex flex-col justify-center px-6 py-10 md:px-14">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8a7350] md:text-sm">A little more mindful</p>
          <h2 className="mt-3 text-3xl font-medium leading-tight md:text-4xl">Small rituals. Softer days.</h2>
          <p className="mt-4 max-w-md text-base leading-7 text-[#4e4943] md:text-lg">
            Made with care, in small batches. The formulas are meant to be used every day, not saved for later.
          </p>
          <Link href="/about" className="mt-6 w-fit border-b border-[#8a7350] pb-1 text-base text-[#2c2926]">
            Read our story
          </Link>
        </div>
      </section>
    </div>
  );
}

function FilterFields({
  categories,
  catalog,
  category,
  priceFloor,
  priceCeil,
  minPrice,
  maxPrice,
  ratingChoice,
  bestseller,
  onCategory,
  onPrice,
  onRating,
  onBestseller,
}: {
  categories: { id: string; name: string }[];
  catalog: Product[];
  category: string;
  priceFloor: number;
  priceCeil: number;
  minPrice: number;
  maxPrice: number;
  ratingChoice: number;
  bestseller: boolean;
  onCategory: (id: string) => void;
  onPrice: (low: number, high: number) => void;
  onRating: (value: number) => void;
  onBestseller: (value: boolean) => void;
}) {
  const options = [{ id: "all", name: "All products" }, ...categories];
  return (
    <div className="text-base text-[#2c2926]">
      <p className="text-base font-medium md:text-lg">Category</p>
      <div className="mt-3 space-y-1" role="radiogroup" aria-label="Category">
        {options.map((item) => {
          const count = item.id === "all" ? catalog.length : catalog.filter((product) => product.categoryId === item.id).length;
          return (
            <Choice
              key={item.id}
              checked={category === item.id}
              onSelect={() => onCategory(item.id)}
              label={item.name}
              hint={<span className="text-sm text-[#6f675d]">({count})</span>}
            />
          );
        })}
      </div>

      <div className="my-6 h-px bg-[#e6e0d6]" />
      <p className="text-base font-medium md:text-lg">Price</p>
      <PriceRange floor={priceFloor} ceil={priceCeil} low={minPrice} high={maxPrice} onChange={onPrice} />

      <div className="my-6 h-px bg-[#e6e0d6]" />
      <p className="text-base font-medium md:text-lg">Rating</p>
      <div className="mt-3 space-y-1" role="radiogroup" aria-label="Minimum rating">
        <Choice checked={ratingChoice === 4} onSelect={() => onRating(ratingChoice === 4 ? 0 : 4)} label="4★ and above" />
        <Choice checked={ratingChoice === 3} onSelect={() => onRating(ratingChoice === 3 ? 0 : 3)} label="3★ and above" />
      </div>

      <div className="my-6 h-px bg-[#e6e0d6]" />
      <Choice checked={bestseller} onSelect={() => onBestseller(!bestseller)} label="Bestsellers only" role="checkbox" />
    </div>
  );
}

function PriceRange({
  floor,
  ceil,
  low,
  high,
  onChange,
}: {
  floor: number;
  ceil: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}) {
  const span = Math.max(ceil - floor, 1);
  const [draft, setDraft] = useState({ low, high });
  const draftRef = useRef(draft);
  const [seen, setSeen] = useState({ low, high });
  const dragging = useRef(false);
  const timer = useRef<number | null>(null);
  const [front, setFront] = useState<"low" | "high">("high");

  if (seen.low !== low || seen.high !== high) {
    setSeen({ low, high });
    if (!dragging.current) {
      draftRef.current = { low, high };
      setDraft({ low, high });
    }
  }

  const start = ((draft.low - floor) / span) * 100;
  const end = ((draft.high - floor) / span) * 100;

  const commit = (next: { low: number; high: number }, immediate = false) => {
    if (timer.current) window.clearTimeout(timer.current);
    if (immediate) {
      onChange(next.low, next.high);
      return;
    }
    timer.current = window.setTimeout(() => onChange(next.low, next.high), 60);
  };

  const setLow = (value: number) => {
    const next = { low: Math.min(value, draftRef.current.high), high: draftRef.current.high };
    draftRef.current = next;
    setDraft(next);
    commit(next);
  };
  const setHigh = (value: number) => {
    const next = { low: draftRef.current.low, high: Math.max(value, draftRef.current.low) };
    draftRef.current = next;
    setDraft(next);
    commit(next);
  };

  const release = () => {
    dragging.current = false;
    commit(draftRef.current, true);
  };

  return (
    <div>
      <p className="mt-3 flex items-center justify-between text-sm text-[#4e4943]">
        <span>{formatPrice(draft.low)}</span>
        <span>{formatPrice(draft.high)}</span>
      </p>
      <div className="price-range mt-4" onPointerUp={release} onPointerCancel={release}>
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-[#e6e0d6]" />
        <div
          className="pointer-events-none absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-[#CBAC7C]"
          style={{ left: `${start}%`, right: `${100 - end}%` }}
        />
        <input
          aria-label="Minimum price"
          type="range"
          min={floor}
          max={ceil}
          step={1}
          value={draft.low}
          onPointerDown={() => {
            dragging.current = true;
            setFront("low");
          }}
          onChange={(event) => setLow(Number(event.target.value))}
          className={front === "low" ? "z-20" : "z-10"}
        />
        <input
          aria-label="Maximum price"
          type="range"
          min={floor}
          max={ceil}
          step={1}
          value={draft.high}
          onPointerDown={() => {
            dragging.current = true;
            setFront("high");
          }}
          onChange={(event) => setHigh(Number(event.target.value))}
          className={front === "high" ? "z-20" : "z-10"}
        />
      </div>
    </div>
  );
}

function Choice({
  checked,
  onSelect,
  label,
  hint,
  role = "radio",
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
  hint?: ReactNode;
  role?: "radio" | "checkbox";
}) {
  return (
    <button type="button" role={role} aria-checked={checked} onClick={onSelect} className="flex min-h-11 w-full items-center gap-3 text-left text-base">
      <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${checked ? "border-[#CBAC7C] bg-[#CBAC7C]" : "border-[#c8bfb4] bg-white"}`}>
        <span className={`size-2 rounded-full bg-white ${checked ? "scale-100" : "scale-0"}`} />
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      {hint}
    </button>
  );
}

function ActiveFilters({
  categoryName,
  priceLabel,
  ratingLabel,
  bestseller,
  types,
  query,
  onClear,
}: {
  categoryName?: string;
  priceLabel?: string;
  ratingLabel?: string;
  bestseller: boolean;
  types: string[];
  query: string;
  onClear: (key: "category" | "max" | "rating" | "bestseller" | "type" | "q") => void;
}) {
  const items: { key: "category" | "max" | "rating" | "bestseller" | "type" | "q"; label: string }[] = [];
  if (query) items.push({ key: "q", label: `Search: ${query}` });
  if (categoryName) items.push({ key: "category", label: categoryName });
  if (priceLabel) items.push({ key: "max", label: priceLabel });
  if (ratingLabel) items.push({ key: "rating", label: ratingLabel });
  if (bestseller) items.push({ key: "bestseller", label: "Bestsellers" });
  if (types.length) items.push({ key: "type", label: types.join(", ") });
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.key}>
          <button type="button" onClick={() => onClear(item.key)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#2c2926] bg-white px-3 text-sm text-[#2c2926]">
            {item.label}
            <X size={14} />
            <span className="sr-only">Remove {item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  current,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  current?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-11 place-items-center rounded-full border bg-white text-base text-[#2c2926] disabled:opacity-40 ${current ? "border-[#2c2926]" : "border-[#e3dbd1]"}`}
    >
      {children}
    </button>
  );
}

function ProductCard({ product }: { product: Product }) {
  const store = useStore();
  const inCart = store.cart.some((item) => item.productId === product.id);
  const variant = product.variants[0];
  const badge = product.bestseller ? "Bestseller" : product.newArrival ? "New" : null;
  const full = Math.round(product.rating);

  const add = () => {
    if (!variant) {
      store.notify("This product has no available size.");
      return;
    }
    const result = store.addToCart(product.id, variant.label, 1);
    if (!result.ok && result.message) store.notify(result.message);
  };

  return (
    <article className="flex h-full min-w-0 flex-col">
      <div className="relative overflow-hidden rounded-lg bg-[#eee8de]">
        <Link href={`/products/${product.slug}`} className="relative block aspect-square">
          <Media src={product.images[0]} alt={product.name} sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, 46vw" className="object-cover" />
        </Link>
        {badge ? <span className="absolute left-2 top-2 max-w-[70%] truncate rounded-full border border-[#e3dbd1] bg-white px-2.5 py-1 text-xs text-[#2c2926] md:left-3 md:top-3">{badge}</span> : null}
      </div>
      <div className="flex flex-1 flex-col pt-3">
        <div className="flex items-start gap-1">
          <Link href={`/products/${product.slug}`} title={product.name} className="line-clamp-2 h-[2.75em] min-w-0 flex-1 overflow-hidden text-base font-medium leading-snug md:text-lg">
            {product.name}
          </Link>
          <WishlistButton productId={product.id} name={product.name} className="-mr-2 -mt-1" />
        </div>
        <p title={product.scent} className="mt-1 truncate text-sm capitalize text-[#4e4943] md:text-base">{product.scent}</p>
        <p className="mt-2 truncate text-sm text-[#8a7350] md:text-base">
          {"★".repeat(full)}
          <span className="text-[#cfc4b6]">{"★".repeat(Math.max(0, 5 - full))}</span>
          <span className="ml-2 text-[#4e4943]">({product.reviewCount})</span>
        </p>
        <p className="mt-2 truncate text-base font-medium md:text-lg">{formatPrice(product.price)}</p>
        <div className="mt-auto pt-3">
          {inCart ? (
            <button type="button" onClick={store.openCart} className="h-11 w-full rounded-full border border-[#CBAC7C] bg-white text-sm text-[#2c2926] md:text-base">
              Go to cart
            </button>
          ) : (
            <button type="button" onClick={add} className="h-11 w-full rounded-full bg-[#CBAC7C] text-sm text-white hover:bg-[#B39668] md:text-base">
              Add to cart
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function normalizeSort(value: string | null) {
  if (value === "price-asc" || value === "price-low") return "price-low";
  if (value === "price-desc" || value === "price-high") return "price-high";
  if (value === "newest" || value === "rating") return value;
  return "featured";
}

function compare(a: Product, b: Product, sort: string) {
  if (sort === "price-low") return a.price - b.price;
  if (sort === "price-high") return b.price - a.price;
  if (sort === "rating") return b.rating - a.rating;
  if (sort === "newest") return Number(b.newArrival) - Number(a.newArrival) || b.createdAt.localeCompare(a.createdAt);
  return Number(b.bestseller) - Number(a.bestseller) || b.rating - a.rating;
}
