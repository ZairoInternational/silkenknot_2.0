"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownUp, ArrowRight, Heart, Search, SlidersHorizontal, X } from "lucide-react";
import { seedProducts } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { useSiteMedia } from "@/lib/site-media/client";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { Media, WishlistButton } from "@/components/ui";

const categories = [
  { label: "All Products", id: "all" },
  { label: "Body Care", id: "body-care" },
  { label: "Bath & Soap", id: "bath-soap" },
  { label: "Aromatherapy", id: "aromatherapy" },
  { label: "Lifestyle", id: "lifestyle" },
] as const;

export function ShopPreview() {
  const store = useStore();
  const media = useSiteMedia();
  const collectionCards = [
    { title: "Body Care", description: "Nourish and replenish", image: media.collectionBodyCare, id: "body-care" },
    { title: "Bath & Soap", description: "Slow down and unwind", image: media.collectionBathSoap, id: "bath-soap" },
    { title: "Aromatherapy", description: "Find your calm", image: media.bestsellerCandle, id: "aromatherapy" },
    { title: "Lifestyle", description: "Little everyday luxuries", image: media.collectionLifestyle, id: "lifestyle" },
  ] as const;
  const [category, setCategory] = useState<(typeof categories)[number]["id"]>("all");
  const [sort, setSort] = useState("featured");
  const [search, setSearch] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [wishlistOnly, setWishlistOnly] = useState(false);

  const catalog = store.products.length ? store.products : seedProducts;

  const products = useMemo(() => {
    let list = catalog.filter((product) => product.active);
    if (category !== "all") list = list.filter((product) => product.categoryId === category);
    if (search.trim()) {
      const query = search.toLowerCase().trim();
      list = list.filter((product) => [product.name, product.scent, product.slug, product.type].join(" ").toLowerCase().includes(query));
    }
    if (wishlistOnly) list = list.filter((product) => store.wishlist.includes(product.id));
    if (sort === "price-low") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-high") list.sort((a, b) => b.price - a.price);
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [catalog, category, search, sort, wishlistOnly, store.wishlist]);

  return (
    <main className="mt-[var(--nav-h)] min-h-screen bg-[#f7f4ef] text-[#2c2926]">
      <section className="relative isolate overflow-hidden bg-[#e9e0d2]">
        <div className="absolute inset-0 -z-20">
          <Media src={media.shopHero} alt="" sizes="100vw" className="object-cover object-center" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#f7f4ef]/95 via-[#f7f4ef]/80 to-[#f7f4ef]/20" />
        <div className="site-container px-5 py-14 sm:px-8 sm:py-20 lg:px-14 lg:py-24">
          <p className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.24em] text-[#59634b]">
            <span className="h-px w-7 bg-[#59634b]" />
            The Silken Knot collection
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-7xl">
            Little rituals.
            <br />
            Beautifully made.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#625b52] sm:text-base">
            Thoughtful body care, comforting scents, and everyday essentials to make your ordinary moments feel special.
          </p>
          <a href="#shop-products" className="mt-7 inline-flex min-h-11 items-center gap-3 rounded-full bg-[#CBAC7C] px-6 py-3 text-sm text-white transition hover:bg-[#B39668]">
            Discover the collection
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      <section className="site-container px-5 pb-8 pt-10 sm:px-8 sm:pt-14 lg:px-14">
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#898675]">Find your ritual</p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl">Shop by collection</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {collectionCards.map((card) => (
            <CategoryCard key={card.id} title={card.title} description={card.description} image={card.image} onClick={() => setCategory(card.id)} />
          ))}
        </div>
      </section>

      <section id="shop-products" className="site-container scroll-mt-24 px-5 py-10 sm:px-8 sm:py-14 lg:px-14">
        <div className="flex flex-col justify-between gap-5 border-b border-[#e5dfd3] pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#898675]">Made for your moments</p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl">Shop all products</h2>
            <p className="mt-2 text-sm text-[#777166]">{products.length} products to discover</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#ddd6cc] bg-[#fbf9f6] px-3 sm:min-w-[190px] sm:flex-none">
              <Search size={15} className="shrink-0 text-[#898675]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find a favourite..."
                aria-label="Search products"
                className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-[#a29b90]"
              />
              {search ? (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={14} />
                </button>
              ) : null}
            </label>
            <label className="flex h-10 items-center gap-2 rounded-full border border-[#ddd6cc] bg-[#fbf9f6] px-3">
              <ArrowDownUp size={14} className="text-[#777166]" />
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products" className="max-w-[125px] bg-transparent text-xs outline-none sm:max-w-none">
                <option value="featured">Featured</option>
                <option value="name">Name: A–Z</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
            <button type="button" onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} className="flex h-10 items-center gap-2 rounded-full border border-[#ddd6cc] px-3 text-xs lg:hidden">
              <SlidersHorizontal size={14} />
              Categories
            </button>
          </div>
        </div>

        <div className={`${mobileFiltersOpen ? "flex" : "hidden"} mt-5 flex-wrap gap-2 lg:flex`}>
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCategory(item.id);
                setMobileFiltersOpen(false);
              }}
              className={`rounded-full border bg-white px-4 py-2.5 text-xs transition ${item.id === category ? "border-[#2c2926] text-[#2c2926]" : "border-[#ddd6cc] text-[#5e574e] hover:border-mist-ink"}`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setWishlistOnly(!wishlistOnly)}
            className={`inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-xs transition ${wishlistOnly ? "border-[#2c2926] text-[#2c2926]" : "border-[#ddd6cc] text-[#5e574e]"}`}
          >
            <Heart size={14} fill={wishlistOnly ? "currentColor" : "none"} />
            Wishlist
          </button>
        </div>

        {products.length > 0 ? (
          <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9 md:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ShopProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center py-16 text-center">
            <Search size={27} strokeWidth={1.3} className="text-[#858477]" />
            <h3 className="mt-5 font-serif text-2xl">Nothing found just yet.</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#777166]">Try another search or explore a different collection.</p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setWishlistOnly(false);
              }}
              className="mt-5 rounded-full bg-[#CBAC7C] px-6 py-3 text-sm text-white hover:bg-[#B39668]"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      <section className="border-y border-[#e5dfd3] bg-[#efebe2]">
        <div className="site-container grid gap-8 px-5 py-10 sm:px-8 sm:py-14 md:grid-cols-2 md:items-center lg:px-14">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#858477]">A moment just for you</p>
            <h2 className="mt-3 max-w-lg font-serif text-3xl leading-tight sm:text-4xl">Make room for the little things that feel good.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#6c655b]">Discover thoughtful formulas and comforting fragrances designed to bring a little more calm to your everyday.</p>
          </div>
          <Link href="/shop#products" className="group flex min-h-12 items-center justify-between gap-4 rounded-full border border-mist bg-[#f7f4ef] px-6 py-4 text-sm transition hover:border-mist-ink hover:bg-[#CBAC7C] hover:text-white">
            Explore all our essentials
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function CategoryCard({ title, description, image, onClick }: { title: string; description: string; image: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group text-left">
      <div className="relative aspect-[4/4.5] overflow-hidden rounded-xl bg-[#e9e0d2] sm:aspect-[4/4]">
        <Media src={image} alt={title} sizes="(min-width: 768px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-white sm:p-4">
          <div>
            <h3 className="font-serif text-lg sm:text-xl">{title}</h3>
            <p className="mt-1 text-[10px] text-white/80 sm:text-xs">{description}</p>
          </div>
          <span className="mb-1 grid size-8 shrink-0 place-items-center rounded-full border border-white/60 transition group-hover:bg-white group-hover:text-mist-ink">
            <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </button>
  );
}

function ShopProductCard({ product }: { product: Product }) {
  const store = useStore();
  const variant = product.variants[0];
  const addToCart = () => {
    if (!variant) {
      store.notify("This product has no available variant.");
      return;
    }
    const result = store.addToCart(product.id, variant.label, 1);
    if (!result.ok && result.message) store.notify(result.message);
  };

  return (
    <article className="group min-w-0">
      <div className="relative overflow-hidden rounded-xl bg-[#eee8de]">
        <Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`} className="relative block aspect-[4/4.5] sm:aspect-[4/4.4]">
          <Media src={product.images[0]} alt={product.name} sizes="(min-width: 1280px) 23vw, (min-width: 768px) 30vw, 48vw" className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.04] sm:p-5" />
        </Link>
        <span className="absolute left-2.5 top-2.5 rounded-full bg-[#f7f4ef]/90 px-2.5 py-1 text-[9px] uppercase tracking-wider text-[#59634b] sm:left-3 sm:top-3">Handcrafted</span>
      </div>
      <div className="pt-3 sm:pt-4">
        <div className="flex items-start gap-1">
          <Link href={`/products/${product.slug}`} className="line-clamp-2 min-w-0 flex-1 font-serif text-base leading-snug text-[#2c2926] transition hover:text-mist-ink sm:text-lg">
            {product.name}
          </Link>
          <WishlistButton productId={product.id} name={product.name} className="-mr-2 -mt-1" />
        </div>
        <p className="mt-1 truncate text-[11px] text-[#8a8178] sm:text-xs">{product.scent}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] tracking-wider text-[#8c784c]">★★★★★</span>
          <span className="text-[10px] text-[#888176] sm:text-xs">
            {product.rating.toFixed(1)} ({product.reviewCount})
          </span>
        </div>
        <p className="mt-2 text-sm font-medium text-[#2c2926] sm:text-base">{formatPrice(product.price)}</p>
        <button type="button" onClick={addToCart} className="mt-3 h-10 w-full rounded-full bg-[#CBAC7C] px-3 text-xs font-medium text-white transition duration-300 hover:bg-[#B39668] sm:h-11 sm:text-sm">
          Add to cart
        </button>
      </div>
    </article>
  );
}
