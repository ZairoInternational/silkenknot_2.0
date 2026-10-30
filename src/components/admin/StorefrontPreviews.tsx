"use client";

import { useEffect, useState } from "react";
import { Flame, Gift, Leaf, Sparkles, Star, Truck, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Media } from "@/components/ui";
import { DraftPreviewFrame } from "@/components/admin/DraftPreviewFrame";
import type { AnnouncementIcon, AnnouncementSettings } from "@/lib/announcements/content";
import {
  BRAND_PLACEMENT_META,
  BRAND_PLACEMENTS,
  DEFAULT_BRAND,
  getBrandPlacement,
  getBrandPlacementIcon,
  type BrandSettings,
} from "@/lib/brand/content";
import { formatPrice } from "@/lib/format";
import type { SiteMediaSettings } from "@/lib/site-media/content";
import type { Category, Product } from "@/lib/types";

const announcementIcons: Record<AnnouncementIcon, LucideIcon> = {
  sparkles: Sparkles,
  truck: Truck,
  gift: Gift,
  leaf: Leaf,
  flame: Flame,
};

export function AnnouncementDraftPreview({ settings }: { settings: AnnouncementSettings }) {
  const active = settings.enabled ? settings.notes.filter((note) => note.active && note.text.trim()) : [];
  const [index, setIndex] = useState(0);
  const note = active[Math.min(index, Math.max(active.length - 1, 0))];

  useEffect(() => {
    setIndex(0);
  }, [settings.enabled, settings.notes]);

  useEffect(() => {
    if (active.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % active.length), 3200);
    return () => window.clearInterval(timer);
  }, [active.length]);

  return (
    <DraftPreviewFrame title="Announcement preview" hint="Matches the black bar at the top of the store." bodyClassName="bg-black">
      {!settings.enabled ? (
        <p className="px-4 py-8 text-center text-sm text-white/70">Bar is off — nothing shows on the site.</p>
      ) : !note ? (
        <p className="px-4 py-8 text-center text-sm text-white/70">No active messages — the bar will hide.</p>
      ) : (
        <div className="relative flex h-10 items-center justify-center px-10 text-white">
          <span className="inline-flex items-center gap-2 whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.08em]">
            {(() => {
              const Icon = announcementIcons[note.icon] || Sparkles;
              return <Icon size={13} strokeWidth={1.75} className="shrink-0 text-[#f0c9a0]" aria-hidden />;
            })()}
            {note.text}
          </span>
          <span className="absolute right-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10" aria-hidden>
            <X size={12} />
          </span>
        </div>
      )}
    </DraftPreviewFrame>
  );
}

function BrandMarkSample({
  brand,
  placement,
  wordmarkClassName = "text-sm",
}: {
  brand: BrandSettings;
  placement: (typeof BRAND_PLACEMENTS)[number];
  wordmarkClassName?: string;
}) {
  const spot = getBrandPlacement(brand, placement);
  const src = getBrandPlacementIcon(brand, placement);
  const name = brand.iconAlt || DEFAULT_BRAND.iconAlt;
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        style={{
          height: spot.height,
          width: "auto",
          maxWidth: spot.maxWidth,
          filter: spot.lightOnDark ? "brightness(0) invert(1)" : undefined,
        }}
        className="object-contain"
      />
      {spot.showWordmark ? <span className={wordmarkClassName}>{name}</span> : null}
    </span>
  );
}

function BrandContextStage({
  brand,
  placement,
}: {
  brand: BrandSettings;
  placement: (typeof BRAND_PLACEMENTS)[number];
}) {
  if (placement === "header") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="flex h-8 items-center justify-center bg-black text-[9px] uppercase tracking-[0.16em] text-white/70">
          Free shipping over ₹999
        </div>
        <div className="flex h-[4.5rem] items-center justify-between px-5">
          <span className="text-[10px] uppercase tracking-[0.14em] text-mute">Menu</span>
          <BrandMarkSample brand={brand} placement={placement} wordmarkClassName="font-serif text-lg" />
          <span className="text-[10px] uppercase tracking-[0.14em] text-mute">Bag</span>
        </div>
      </div>
    );
  }
  if (placement === "footer") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-white px-5 py-6 text-ink shadow-sm">
        <BrandMarkSample brand={brand} placement={placement} wordmarkClassName="font-serif text-2xl text-[#2F6FED]" />
        <p className="mt-4 max-w-xs text-xs leading-5 text-mute">
          Body care, bath, and scent for everyday rituals.
        </p>
      </div>
    );
  }
  if (placement === "checkout") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="flex h-16 items-center justify-between px-5">
          <BrandMarkSample brand={brand} placement={placement} wordmarkClassName="text-base text-ink" />
          <span className="text-xs text-mute">Back to shop</span>
        </div>
        <div className="border-t border-line bg-[#faf7f2] px-5 py-8 text-center text-xs text-mute">
          Checkout steps
        </div>
      </div>
    );
  }
  if (placement === "auth") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line shadow-sm">
        <div className="bg-[#3d3832] px-5 py-6 text-[#f6f1ea]">
          <BrandMarkSample brand={brand} placement={placement} wordmarkClassName="text-sm text-[#f6f1ea]" />
          <p className="mt-4 font-serif text-2xl leading-tight">Self care is a beautiful habit.</p>
        </div>
        <div className="bg-white px-5 py-6 text-xs text-mute">Sign-in form</div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#fbf9f6] px-5 py-8 text-center shadow-sm">
      <div className="flex justify-center">
        <BrandMarkSample brand={brand} placement={placement} />
      </div>
      <p className="mt-4 font-serif text-xl text-ink">A little something</p>
      <p className="mt-1 text-xs text-mute">Welcome offer scratch card</p>
    </div>
  );
}

export function BrandDraftPreview({
  brand,
  activePlacement = "header",
  onSelectPlacement,
}: {
  brand: BrandSettings;
  activePlacement?: (typeof BRAND_PLACEMENTS)[number];
  onSelectPlacement?: (placement: (typeof BRAND_PLACEMENTS)[number]) => void;
}) {
  const meta = BRAND_PLACEMENT_META[activePlacement];
  const spot = getBrandPlacement(brand, activePlacement);
  return (
    <DraftPreviewFrame
      title="Live preview"
      hint={`${meta.title} · ${spot.height}×${spot.maxWidth}px`}
      bodyClassName="bg-[#f3eee6]"
    >
      <div className="space-y-4 p-4">
        <BrandContextStage brand={brand} placement={activePlacement} />
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-mute">All surfaces</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {BRAND_PLACEMENTS.map((placement) => {
              const item = BRAND_PLACEMENT_META[placement];
              const active = placement === activePlacement;
              const dark = item.surface === "dark";
              return (
                <button
                  key={placement}
                  type="button"
                  onClick={() => onSelectPlacement?.(placement)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-ink ring-1 ring-ink"
                      : "border-line hover:border-[#d6cfc4]"
                  } ${dark ? "bg-[#2c2926] text-[#f6f1ea]" : "bg-white/90"}`}
                >
                  <p className={`text-[10px] uppercase tracking-[0.12em] ${dark ? "text-white/55" : "text-mute"}`}>
                    {item.title}
                  </p>
                  <div className="mt-2 flex min-h-8 items-center">
                    <BrandMarkSample
                      brand={brand}
                      placement={placement}
                      wordmarkClassName={`text-xs ${dark ? "text-[#f6f1ea]" : "text-ink"}`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </DraftPreviewFrame>
  );
}

const SITE_MEDIA_TABS = [
  { id: "shop", label: "Shop" },
  { id: "strip", label: "Category strip" },
  { id: "collections", label: "Collections" },
  { id: "story", label: "Story blocks" },
  { id: "reviews", label: "Reviews" },
  { id: "checkout", label: "Checkout" },
  { id: "wishlist", label: "Wishlist" },
  { id: "auth", label: "Sign-in" },
] as const;

type SiteMediaTab = (typeof SITE_MEDIA_TABS)[number]["id"];

export function SiteMediaDraftPreview({ media }: { media: SiteMediaSettings }) {
  const [tab, setTab] = useState<SiteMediaTab>("shop");

  return (
    <DraftPreviewFrame
      title="Website photos preview"
      hint="Switch surfaces to check how draft images land on the store."
    >
      <div className="flex flex-wrap gap-2 border-b border-line px-3 py-3">
        {SITE_MEDIA_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] ${
              tab === item.id ? "bg-ink text-paper" : "bg-cream text-mute hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "shop" ? <ShopSurfacePreview media={media} /> : null}
        {tab === "strip" ? <CategoryStripPreview items={media.categoryStrip} /> : null}
        {tab === "collections" ? <CollectionsPreview media={media} /> : null}
        {tab === "story" ? <StoryBlocksPreview media={media} /> : null}
        {tab === "reviews" ? <ReviewsPreview media={media} /> : null}
        {tab === "checkout" ? <CheckoutPreview media={media} /> : null}
        {tab === "wishlist" ? <WishlistPreview media={media} /> : null}
        {tab === "auth" ? <AuthPreview media={media} /> : null}
      </div>
    </DraftPreviewFrame>
  );
}

function ShopSurfacePreview({ media }: { media: SiteMediaSettings }) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-line bg-[#f6f3ee]">
        <div className="grid md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative order-first min-h-[160px] md:order-last md:min-h-[220px]">
            <Media src={media.shopHero} alt="Shop hero" sizes="600px" className="object-cover" />
          </div>
          <div className="flex flex-col justify-center px-5 py-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#8a7350]">Shop our collections</p>
            <p className="mt-2 font-serif text-2xl leading-tight text-[#2c2926]">Natural care for your everyday rituals</p>
            <p className="mt-2 text-sm text-[#4e4943]">Shop page top banner uses this photo.</p>
          </div>
        </div>
      </div>
      <div className="relative min-h-[140px] overflow-hidden rounded-xl border border-line">
        <Media src={media.shopEditorial} alt="Shop editorial" sizes="800px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f6f3ee]/90 via-[#f6f3ee]/55 to-transparent" />
        <p className="absolute bottom-4 left-4 text-sm font-medium text-ink">Lower shop story banner</p>
      </div>
    </div>
  );
}

function CategoryStripPreview({ items }: { items: SiteMediaSettings["categoryStrip"] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white px-4 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex min-w-max items-start gap-5">
        {items.map((item) => (
          <li key={item.id || item.name} className="w-[100px] shrink-0 text-center">
            <span className="relative mx-auto block size-[88px] overflow-hidden rounded-full bg-[#e7dfd4] ring-4 ring-white">
              <Media src={item.image} alt="" sizes="88px" className="object-cover" />
            </span>
            <span className="mt-3 block text-sm font-medium text-ink">{item.name || "Untitled"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CollectionsPreview({ media }: { media: SiteMediaSettings }) {
  const tiles = [
    { label: "Body Care", src: media.collectionBodyCare },
    { label: "Bath & Soap", src: media.collectionBathSoap },
    { label: "Aromatherapy", src: media.collectionAromatherapy },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="overflow-hidden rounded-xl border border-line bg-paper">
          <div className="relative aspect-[4/5]">
            <Media src={tile.src} alt={tile.label} sizes="280px" className="object-cover" />
          </div>
          <p className="px-3 py-2 text-sm font-medium text-ink">{tile.label}</p>
        </div>
      ))}
    </div>
  );
}

function StoryBlocksPreview({ media }: { media: SiteMediaSettings }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="relative aspect-[5/4]">
            <Media src={media.whySilkKnot} alt="Why Silken Knot" sizes="400px" className="object-cover" />
          </div>
          <p className="px-3 py-2 text-sm">Why Silken Knot</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="relative aspect-[5/4]">
            <Media src={media.brandStory} alt="Brand story" sizes="400px" className="object-cover" />
          </div>
          <p className="px-3 py-2 text-sm">Brand story</p>
        </div>
      </div>
      <div className="relative min-h-[120px] overflow-hidden rounded-xl border border-line">
        <Media src={media.newsletterBackground} alt="Newsletter" sizes="800px" className="object-cover" />
        <div className="absolute inset-0 bg-[#2c2926]/45" />
        <p className="absolute inset-0 flex items-center justify-center text-sm text-white">Newsletter background</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Butter", src: media.bestsellerButter },
          { label: "Soap", src: media.bestsellerSoap },
          { label: "Candle", src: media.bestsellerCandle },
        ].map((item) => (
          <div key={item.label} className="overflow-hidden rounded-lg border border-line">
            <div className="relative aspect-square">
              <Media src={item.src} alt={item.label} sizes="160px" className="object-cover" />
            </div>
            <p className="px-2 py-1.5 text-[11px] text-mute">Bestseller · {item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewsPreview({ media }: { media: SiteMediaSettings }) {
  if (!media.reviews.length) {
    return <p className="text-sm text-mute">No review cards yet.</p>;
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {media.reviews.map((review) => (
        <article
          key={review.id}
          className="w-[min(100%,20rem)] shrink-0 rounded-[22px] border border-white/80 bg-white/85 p-3 shadow-sm sm:p-4"
        >
          <div className="relative aspect-[1.75/1] overflow-hidden rounded-[15px] bg-[#EEE5D9]">
            <Media src={review.image} alt={review.productName} sizes="320px" className="object-cover" />
          </div>
          <div className="mt-3 flex items-center gap-1 text-[#B28B55]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} size={14} className={index < review.rating ? "fill-current" : "fill-transparent"} />
            ))}
          </div>
          <p className="mt-3 line-clamp-4 font-serif text-base leading-relaxed text-[#45372C]">“{review.text}”</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#3D3026]">{review.name}</p>
              <p className="text-xs text-[#8B8076]">{review.city}</p>
            </div>
            <span className="max-w-[45%] truncate rounded-full bg-[#F3EBE0] px-3 py-1.5 text-[11px] text-[#775638]">
              {review.productName}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function CheckoutPreview({ media }: { media: SiteMediaSettings }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-line px-5 py-8"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(247, 243, 238, 0.94) 0%, rgba(247, 243, 238, 0.78) 46%, rgba(247, 243, 238, 0.28) 100%), url("${media.checkoutBanner}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a7350]">Checkout</p>
      <p className="mt-2 font-serif text-2xl text-ink">Complete your order</p>
      <p className="mt-2 max-w-sm text-sm text-mute">Header banner behind the checkout title.</p>
    </div>
  );
}

function WishlistPreview({ media }: { media: SiteMediaSettings }) {
  return (
    <div className="relative min-h-[180px] overflow-hidden rounded-xl border border-line">
      <Media src={media.wishlistBanner} alt="Wishlist" sizes="800px" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#2c2926]/55 to-transparent" />
      <div className="absolute bottom-4 left-4 text-white">
        <p className="text-[10px] uppercase tracking-[0.16em] text-white/70">Wishlist</p>
        <p className="mt-1 font-serif text-2xl">Saved for later</p>
      </div>
    </div>
  );
}

function AuthPreview({ media }: { media: SiteMediaSettings }) {
  return (
    <div className="grid overflow-hidden rounded-xl border border-line md:grid-cols-2">
      <div className="relative min-h-[180px]">
        <Media src={media.authBackground} alt="Sign-in background" sizes="500px" className="object-cover" />
      </div>
      <div className="flex flex-col justify-center bg-[#f7f3ee] px-5 py-6">
        <p className="font-serif text-2xl text-ink">Welcome back</p>
        <p className="mt-2 text-sm text-mute">Sign-in page background on the left.</p>
        <div className="mt-4 h-10 rounded-full border border-line bg-white" />
        <div className="mt-2 h-10 rounded-full bg-ink" />
      </div>
    </div>
  );
}

export function CategoryDraftPreview({ category }: { category: Category }) {
  return (
    <DraftPreviewFrame title="Category preview" hint="How this group can appear in search and menu fallbacks.">
      <div className="p-4">
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <div className="relative aspect-[5/3] bg-[#e7dfd4]">
            {category.image ? (
              <Media src={category.image} alt={category.name || "Category"} sizes="480px" className="object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-sm text-mute">Add a primary image</div>
            )}
          </div>
          <div className="space-y-1 px-4 py-4">
            <p className="font-serif text-2xl text-ink">{category.name || "Category name"}</p>
            <p className="text-sm text-mute">{category.description || "Short description shows with the group."}</p>
            {category.imageAlt ? (
              <div className="relative mt-3 h-16 overflow-hidden rounded-lg border border-line">
                <Media src={category.imageAlt} alt="" sizes="240px" className="object-cover" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </DraftPreviewFrame>
  );
}

export function ProductDraftPreview({ product }: { product: Product }) {
  const price = product.variants[0]?.price;
  const image = product.images[0];
  return (
    <DraftPreviewFrame title="Product preview" hint="Shop-card style view. Full product page updates after you save.">
      <div className="p-4">
        <article className="overflow-hidden rounded-2xl border border-line bg-[#f7f4ef]">
          <div className="relative aspect-[4/4.4] bg-[#eee5d9]">
            {image ? (
              <Media src={image} alt={product.name || "Product"} sizes="360px" className="object-contain p-4" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-sm text-mute">Upload a photo</div>
            )}
          </div>
          <div className="space-y-1 px-4 py-4">
            <p className="truncate text-[11px] uppercase tracking-[0.14em] text-[#8a7350]">{product.type || "Type"}</p>
            <p className="truncate font-serif text-xl text-ink">{product.name || "Product name"}</p>
            <p className="text-sm font-medium text-ink">{typeof price === "number" ? formatPrice(price) : "Add a price"}</p>
            {product.shortDescription ? (
              <p className="line-clamp-2 text-sm text-mute">{product.shortDescription}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              {product.bestseller ? <span className="rounded-full bg-[#CBAC7C]/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[#8a7350]">Bestseller</span> : null}
              {product.newArrival ? <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-ink">New</span> : null}
              {!product.active ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-red-700">Hidden</span> : null}
            </div>
          </div>
        </article>
      </div>
    </DraftPreviewFrame>
  );
}
