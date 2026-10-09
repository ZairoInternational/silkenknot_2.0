"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/product/ProductCard";
import { BottomSheet } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

const PAGE_SIZE = 9;

export function ShopClient() {
  const store = useStore();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const urlQuery = params.get("q") ?? "";
  const [draft, setDraft] = useState(urlQuery);
  const [seenQuery, setSeenQuery] = useState(urlQuery);
  if (urlQuery !== seenQuery) {
    setSeenQuery(urlQuery);
    setDraft(urlQuery);
  }

  const category = params.get("category") ?? "";
  const type = params.get("type") ?? "";
  const sort = params.get("sort") ?? "featured";
  const min = Number(params.get("min") || 0);
  const max = Number(params.get("max") || 0);
  const bestseller = params.get("bestseller") === "1";
  const query = urlQuery.trim().toLowerCase();
  const page = Math.max(1, Number(params.get("page") || 1));

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const current = params.get("q") ?? "";
      if (draft === current) return;
      write({ q: draft || undefined, page: undefined });
    }, 250);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  function write(next: Record<string, string | undefined>) {
    const search = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (!value) search.delete(key);
      else search.set(key, value);
    });
    const qs = search.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const activeCategory = store.categories.find((item) => item.id === category);

  const filtered = useMemo(() => {
    const types = type.split(",").map((item) => item.trim()).filter(Boolean);
    let items = store.activeProducts.filter((product) => {
      if (category && product.categoryId !== category) return false;
      if (types.length && !types.includes(product.type)) return false;
      if (bestseller && !product.bestseller) return false;
      if (min && product.price < min) return false;
      if (max && product.price > max) return false;
      if (query) {
        const haystack = `${product.name} ${product.type} ${product.scent} ${product.shortDescription}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    items = [...items].sort((a, b) => compare(a, b, sort));
    return items;
  }, [store.activeProducts, category, type, bestseller, min, max, query, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const filters = (
    <FilterFields
      category={category}
      sort={sort}
      min={params.get("min") ?? ""}
      max={params.get("max") ?? ""}
      bestseller={bestseller}
      categories={store.categories}
      onChange={write}
    />
  );

  return (
    <div className="page-pad px-5 pb-24 md:px-10">
      <header className="max-w-3xl">
        <p className="eyebrow text-mute">The collection</p>
        <h1 className="mt-3 font-serif text-6xl md:text-7xl">{activeCategory?.name ?? (bestseller ? "Best sellers" : "Shop")}</h1>
        <p className="mt-4 max-w-xl text-mute">
          {activeCategory?.description ?? "Body care, bath, aromatherapy, and the clothes that follow."}
        </p>
      </header>

      <div className="mt-10 flex items-center justify-between gap-4 md:hidden">
        <p className="text-sm text-mute">{filtered.length} pieces</p>
        <button type="button" className="border border-ink px-4 py-3 text-[11px] uppercase tracking-[0.16em]" onClick={() => setFiltersOpen(true)}>
          Filter & sort
        </button>
      </div>

      <div className="mt-12 grid gap-12 md:grid-cols-[200px_1fr]">
        <aside className="hidden md:block">{filters}</aside>
        <div>
          <div className="hidden items-center justify-between gap-4 md:flex">
            <label className="flex items-center gap-3 text-sm">
              <span className="eyebrow text-mute">Search</span>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Search the collection"
                className="h-10 border-b border-line bg-transparent outline-none"
              />
            </label>
            <p className="text-sm text-mute">{filtered.length} pieces</p>
          </div>
          <label className="mt-4 block md:hidden">
            <span className="sr-only">Search the collection</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search the collection"
              className="h-12 w-full border-b border-line bg-transparent outline-none"
            />
          </label>
          {visible.length === 0 ? (
            <p className="mt-16 font-serif text-4xl">Nothing in this edit. Soften the filters.</p>
          ) : (
            <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-3 lg:gap-x-8">
              {visible.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
          {pages > 1 ? (
            <nav aria-label="Pagination" className="mt-14 flex items-center gap-3">
              <button type="button" disabled={safePage <= 1} className="text-[11px] uppercase tracking-[0.16em] disabled:opacity-30" onClick={() => write({ page: String(safePage - 1) })}>
                Previous
              </button>
              <p className="text-sm text-mute">
                {safePage} / {pages}
              </p>
              <button type="button" disabled={safePage >= pages} className="text-[11px] uppercase tracking-[0.16em] disabled:opacity-30" onClick={() => write({ page: String(safePage + 1) })}>
                Next
              </button>
            </nav>
          ) : null}
        </div>
      </div>

      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} label="Filters">
        <div className="overflow-y-auto px-5 py-6">
          <div className="mb-6 flex items-center justify-between">
            <p className="font-serif text-3xl">Filter & sort</p>
            <button type="button" onClick={() => setFiltersOpen(false)} className="text-[11px] uppercase tracking-[0.16em]">Done</button>
          </div>
          {filters}
        </div>
      </BottomSheet>
    </div>
  );
}

function FilterFields({
  category,
  sort,
  min,
  max,
  bestseller,
  categories,
  onChange,
}: {
  category: string;
  sort: string;
  min: string;
  max: string;
  bestseller: boolean;
  categories: { id: string; name: string }[];
  onChange: (next: Record<string, string | undefined>) => void;
}) {
  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="eyebrow text-mute">Category</legend>
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="category" checked={!category} onChange={() => onChange({ category: undefined, page: undefined })} />
            All
          </label>
          {categories.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="category"
                checked={category === item.id}
                onChange={() => onChange({ category: item.id, page: undefined })}
              />
              {item.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="eyebrow text-mute">Price</legend>
        <div className="mt-3 flex gap-3">
          <label className="text-sm">
            Min
            <input
              inputMode="numeric"
              value={min}
              onChange={(event) => onChange({ min: event.target.value || undefined, page: undefined })}
              className="mt-1 block h-10 w-full border-b border-line bg-transparent outline-none"
            />
          </label>
          <label className="text-sm">
            Max
            <input
              inputMode="numeric"
              value={max}
              onChange={(event) => onChange({ max: event.target.value || undefined, page: undefined })}
              className="mt-1 block h-10 w-full border-b border-line bg-transparent outline-none"
            />
          </label>
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={bestseller}
          onChange={(event) => onChange({ bestseller: event.target.checked ? "1" : undefined, page: undefined })}
        />
        Best sellers
      </label>
      <label className="block text-sm">
        <span className="eyebrow text-mute">Sort</span>
        <select
          value={sort}
          onChange={(event) => onChange({ sort: event.target.value === "featured" ? undefined : event.target.value, page: undefined })}
          className="mt-3 block h-10 w-full border-b border-line bg-transparent outline-none"
        >
          <option value="featured">Featured</option>
          <option value="newest">New arrivals</option>
          <option value="price-asc">Price, low to high</option>
          <option value="price-desc">Price, high to low</option>
          <option value="rating">Rating</option>
        </select>
      </label>
      <button
        type="button"
        className="text-[11px] uppercase tracking-[0.16em] text-mute"
        onClick={() => onChange({ category: undefined, type: undefined, sort: undefined, min: undefined, max: undefined, bestseller: undefined, q: undefined, page: undefined })}
      >
        Clear all
      </button>
    </div>
  );
}

function compare(a: Product, b: Product, sort: string) {
  if (sort === "price-asc") return a.price - b.price;
  if (sort === "price-desc") return b.price - a.price;
  if (sort === "rating") return b.rating - a.rating;
  if (sort === "newest") return Number(b.newArrival) - Number(a.newArrival) || b.createdAt.localeCompare(a.createdAt);
  return Number(b.featured) - Number(a.featured) || Number(b.bestseller) - Number(a.bestseller);
}
