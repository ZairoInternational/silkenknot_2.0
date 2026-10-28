"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowRight,
  ChevronDown,
  Heart,
  Leaf,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";

import { seedProducts } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { useSiteMedia } from "@/lib/site-media/client";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { Media, WishlistButton } from "@/components/ui";

const notes = [
  {
    icon: Leaf,
    title: "Natural Ingredients",
    copy: "Pure and gentle on your skin.",
  },
  {
    icon: Heart,
    title: "Handmade with Love",
    copy: "Crafted with care.",
  },
  {
    icon: Truck,
    title: "Free Shipping",
    copy: "On orders over ₹999.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Checkout",
    copy: "Shop with confidence.",
  },
];

export function WishlistView() {
  const store = useStore();
  const [sort, setSort] = useState("recent");

  const catalog = store.products.length ? store.products : seedProducts;

  const products = useMemo(() => {
    const saved = store.wishlist
      .map(
        (id) =>
          catalog.find((product) => product.id === id) ??
          seedProducts.find((product) => product.id === id),
      )
      .filter((product): product is Product =>
        Boolean(product && product.active),
      );

    const list = [...saved];

    if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sort === "price-low") {
      list.sort((a, b) => a.price - b.price);
    }

    if (sort === "price-high") {
      list.sort((a, b) => b.price - a.price);
    }

    if (sort === "recent") {
      list.reverse();
    }

    return list;
  }, [catalog, store.wishlist, sort]);

  return (
    <div className="bg-[#f7f4ef] pb-0 text-[#2c2926]">
      <WishlistBanner empty={products.length === 0} />

      {products.length === 0 ? (
        <EmptyWishlist />
      ) : (
        <WishlistGrid products={products} sort={sort} onSort={setSort} />
      )}
    </div>
  );
}

function WishlistBanner({ empty }: { empty: boolean }) {
  const media = useSiteMedia();
  return (
    <section className="relative isolate mt-[var(--nav-h)] overflow-hidden bg-[#e9e0d2]">
      <div className="absolute inset-0 -z-20">
        <Media
          src={media.wishlistBanner}
          alt=""
          sizes="100vw"
          className="object-cover object-[65%_50%]"
        />
      </div>

      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#f7f4ef]/95 via-[#f7f4ef]/80 to-[#f7f4ef]/15" />

      <div className="site-container relative px-5 py-14 sm:px-8 sm:py-16 lg:px-14 lg:py-[76px]">
        <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.24em] text-mist-ink">
          <span className="h-px w-6 bg-mist-ink" />
          Your wishlist
        </p>

        <h1 className="mt-4 max-w-xl font-serif text-[38px] leading-[1.08] tracking-tight text-[#2c2926] sm:text-5xl lg:text-[58px]">
          {empty ? (
            <>Your wishlist is empty.</>
          ) : (
            <>
              A little list
              <br />
              of what you love.
            </>
          )}
        </h1>

        <p className="mt-4 max-w-[390px] text-sm leading-6 text-[#625b52] sm:text-[15px] sm:leading-7">
          {empty
            ? "Your next self-care favourite is waiting to be discovered. Find something special and save it for later."
            : "Keep your favourite Silken Knot essentials close. Save the little things you love and return whenever you're ready."}
        </p>

        {empty && (
          <Link
            href="/shop"
            className="mt-7 inline-flex min-h-11 items-center gap-3 rounded-full bg-[#CBAC7C] px-6 py-3 text-sm text-white transition duration-300 hover:bg-[#B39668]"
          >
            Explore the collection
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}

const wishlistSorts = [
  ["recent", "Recently added"],
  ["name", "Name, A to Z"],
  ["price-low", "Price, low to high"],
  ["price-high", "Price, high to low"],
] as const;

function WishlistGrid({
  products,
  sort,
  onSort,
}: {
  products: Product[];
  sort: string;
  onSort: (value: string) => void;
}) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = wishlistSorts.find(([value]) => value === sort)?.[1] ?? "Recently added";

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const addAll = () => {
    let added = 0;
    let already = 0;
    products.forEach((product) => {
      if (store.cart.some((line) => line.productId === product.id)) {
        already += 1;
        return;
      }
      const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0];
      if (!variant) return;
      const result = store.addToCart(product.id, variant.label, 1);
      if (result.ok) added += 1;
    });
    if (added > 0) {
      store.notify(added === 1 ? "1 item added to your bag" : `${added} items added to your bag`);
      store.openCart();
      return;
    }
    if (already === products.length) {
      store.notify("These are already in your bag.");
      store.openCart();
      return;
    }
    store.notify("Nothing could be added right now.");
  };

  return (
    <section className="site-container px-5 py-10 sm:px-8 sm:py-14 lg:px-14 lg:py-16">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#858477]">
            Saved for later
          </p>

          <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
            Your favourites
          </h2>

          <p className="mt-2 text-sm text-[#777166]">
            {products.length} {products.length === 1 ? "item" : "items"} you
            love
          </p>
        </div>

        <div className="flex w-full flex-nowrap items-center gap-2 sm:w-auto sm:gap-3">
          <button
            type="button"
            onClick={addAll}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#CBAC7C] px-3 text-xs text-white transition hover:bg-[#B39668] sm:h-12 sm:gap-2 sm:px-5 sm:text-sm"
          >
            <ShoppingBag size={16} />
            Add all to cart
          </button>
          <div ref={menuRef} className="relative min-w-0 flex-1 sm:flex-none">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-full border border-[#e3dbd1] bg-white px-3 text-sm text-[#2c2926] sm:h-12 sm:min-w-[220px] sm:gap-4 sm:px-4 sm:text-base"
            >
              <span className="truncate">
                <span className="text-[#8a7350]">Sort</span>
                <span className="mx-1.5 text-[#e3dbd1] sm:mx-2">/</span>
                {current}
              </span>
              <ChevronDown size={16} className={`shrink-0 text-[#8a7350] transition ${open ? "rotate-180" : ""}`} />
            </button>
            {open ? (
              <ul role="listbox" aria-label="Sort wishlist" className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-full overflow-hidden rounded-2xl border border-[#e3dbd1] bg-white py-2 shadow-[0_18px_50px_-24px_rgba(44,41,38,0.35)]">
                {wishlistSorts.map(([value, label]) => {
                  const selected = sort === value;
                  return (
                    <li key={value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          onSort(value);
                          setOpen(false);
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
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <li key={product.id} className="min-w-0">
            <WishlistCard product={product} />
          </li>
        ))}

        <li className="min-w-0">
          <Link
            href="/shop"
            className="group relative flex h-full min-h-[280px] flex-col items-start justify-center overflow-hidden rounded-2xl border border-[#e6e0d6] bg-[#eeeadf] p-5 transition duration-300 hover:border-[#c5c5b5] hover:bg-[#e9e5d9] sm:min-h-[380px] sm:p-8"
          >
            <div className="absolute -right-12 -top-12 size-36 rounded-full border border-[#d7d5c7] transition duration-500 group-hover:scale-125 sm:size-48" />

            <Leaf size={24} strokeWidth={1.2} className="mb-5 text-[#657057]" />

            <p className="font-serif text-2xl leading-tight text-[#2c2926] sm:text-3xl">
              Still thinking
              <br />
              about something?
            </p>

            <p className="mt-3 max-w-[230px] text-xs leading-5 text-[#6e685e] sm:text-sm sm:leading-6">
              Discover more thoughtful essentials for your everyday rituals.
            </p>

            <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-mist-ink px-4 py-2.5 text-xs text-mist-ink transition group-hover:bg-[#CBAC7C] group-hover:text-white sm:px-5 sm:text-sm">
              Explore the shop
              <ArrowRight size={15} />
            </span>
          </Link>
        </li>
      </ul>

      <div className="mt-12 flex flex-col items-center border-t border-[#e5dfd3] pt-9 text-center">
        <p className="font-serif text-xl sm:text-2xl">
          Make a little time for yourself.
        </p>

        <p className="mt-2 text-sm text-[#777166]">
          Find something beautiful for your next ritual.
        </p>

        <Link
          href="/shop"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#CBAC7C] px-6 py-3 text-sm text-white transition hover:bg-[#B39668]"
        >
          Continue shopping
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

function WishlistCard({ product }: { product: Product }) {
  const store = useStore();
  const variant = product.variants[0];

  const add = () => {
    if (!variant) {
      store.notify("This product has no available variant.");
      return;
    }

    const result = store.addToCart(product.id, variant.label, 1);

    if (result.ok) {
      store.openCart();
    } else if (result.message) {
      store.notify(result.message);
    }
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#e9e3d9] bg-[#fcfaf6] p-2.5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(44,41,38,0.07)] sm:rounded-2xl sm:p-3">
      <div className="relative overflow-hidden rounded-lg bg-[#f0ece4]">
        <Link
          href={`/products/${product.slug}`}
          aria-label={`View ${product.name}`}
          className="block aspect-square"
        >
          <Media
            src={product.images[0]}
            alt={product.name}
            sizes="(min-width: 1280px) 23vw, (min-width: 1024px) 30vw, 48vw"
            className="object-contain p-2 transition duration-500 group-hover:scale-[1.04] sm:p-4"
          />
        </Link>

        <span className="absolute left-2 top-2 rounded-full bg-[#fbf9f6]/90 px-2 py-1 text-[8px] uppercase tracking-wider text-mist-ink sm:left-3 sm:top-3 sm:text-[9px]">
          Silken Knot
        </span>

      </div>

      <div className="flex flex-1 flex-col px-0.5 pb-1 pt-3 sm:px-1 sm:pt-4">
        <div className="flex items-start gap-1">
          <Link
            href={`/products/${product.slug}`}
            className="line-clamp-2 min-w-0 flex-1 font-serif text-[15px] leading-snug text-[#2c2926] transition hover:text-mist-ink sm:text-lg"
          >
            {product.name}
          </Link>
          <WishlistButton productId={product.id} name={product.name} className="-mr-2 -mt-1" />
        </div>

        <p className="mt-1 truncate text-[10px] text-[#8a8178] sm:text-xs">
          {product.scent}
        </p>

        <p className="mt-2 text-sm font-medium text-[#2c2926] sm:text-base">
          {formatPrice(product.price)}
        </p>

        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-[#888176] sm:text-xs">
          <span className="tracking-[0.08em] text-[#8c784c]">★★★★★</span>
          <span>
            {product.rating.toFixed(1)} ({product.reviewCount})
          </span>
        </p>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <button
            type="button"
            onClick={add}
            className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#CBAC7C] px-4 text-sm font-medium text-white transition duration-300 hover:bg-[#B39668] sm:h-11 sm:gap-2 sm:px-3 sm:text-xs"
          >
            <ShoppingBag size={16} className="shrink-0" />
            Add to cart
          </button>

          <button
            type="button"
            aria-label={`Remove ${product.name} from wishlist`}
            onClick={() => {
              store.toggleWishlist(product.id);
              store.notify(`${product.name} removed`);
            }}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[#ddd6cc] text-[#5e574e] transition hover:border-[#cbbdb0] hover:bg-[#f0ece4] hover:text-[#7b4438] sm:size-11"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyWishlist() {
  return (
    <>
      <section className="site-container px-5 py-16 text-center sm:px-8 sm:py-24 lg:py-28">
        <div className="mx-auto grid size-[76px] place-items-center rounded-full border border-[#e2dccf] bg-[#f0ede4]">
          <Heart size={31} strokeWidth={1.2} className="text-mist-ink" />
        </div>

        <p className="mt-7 text-[10px] font-medium uppercase tracking-[0.23em] text-[#898675]">
          Room for something lovely
        </p>

        <h2 className="mt-3 font-serif text-3xl tracking-tight text-[#2c2926] sm:text-4xl">
          No items in your wishlist yet.
        </h2>

        <p className="mx-auto mt-4 max-w-[410px] text-sm leading-7 text-[#6c655b] sm:text-[15px]">
          Save the products you love, so you can easily find them later. Your
          favourite Silken Knot essentials are just a click away.
        </p>

        <Link
          href="/shop"
          className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#CBAC7C] px-6 py-3 text-sm text-white transition duration-300 hover:bg-[#B39668]"
        >
          Explore our collections
          <ArrowRight size={16} />
        </Link>

        <Link
          href="/shop"
          className="mt-4 block text-xs text-[#777166] underline underline-offset-4 transition hover:text-mist-ink"
        >
          Discover best sellers
        </Link>
      </section>

      <WishlistBenefits />
    </>
  );
}

function WishlistBenefits() {
  return (
    <section className="border-y border-[#e5dfd3] bg-[#f0ede4]">
      <div className="site-container grid grid-cols-2 px-5 py-6 sm:px-8 sm:py-9 lg:grid-cols-4 lg:px-14">
        {notes.map((note, index) => {
          const Icon = note.icon;

          return (
            <div
              key={note.title}
              className={`flex flex-col items-center px-3 py-5 text-center sm:px-5 ${
                index % 2 === 1 ? "border-l border-[#dfd9cd]" : ""
              } ${
                index >= 2 ? "border-t border-[#dfd9cd] lg:border-t-0" : ""
              } ${index === 2 ? "lg:border-l lg:border-[#dfd9cd]" : ""} ${
                index === 3 ? "lg:border-l lg:border-[#dfd9cd]" : ""
              }`}
            >
              <Icon size={24} strokeWidth={1.25} className="text-mist-ink" />

              <h3 className="mt-3 font-serif text-base text-[#2c2926] sm:text-lg">
                {note.title}
              </h3>

              <p className="mt-1.5 text-[11px] leading-5 text-[#777166] sm:text-xs">
                {note.copy}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
