"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDown, Check, ChevronDown, ChevronUp, ShoppingBag, Sparkles, SquarePen, Truck } from "lucide-react";
import { Media, WishlistButton } from "@/components/ui";
import { DeliveryChoice } from "@/components/product/DeliveryChoice";
import { ProductClaimsStrip } from "@/components/product/ProductClaims";
import { ProductBreadcrumbs } from "@/components/seo/ProductBreadcrumbs";
import { ProductPageSkeleton } from "@/components/storefront/PageSkeletons";
import { trackViewItem } from "@/lib/analytics";
import { useFullProductBySlug } from "@/lib/catalog/client";
import { seedProducts } from "@/lib/data";
import { couponProductIds, discountPercent, formatPrice } from "@/lib/format";
import { useShippingDisplay } from "@/lib/shipping/client";
import { useStore } from "@/lib/store";
import type { Coupon, Product, Review } from "@/lib/types";
import { productShowsSection } from "@/lib/types";
import { SHOW_STORE_REVIEWS } from "@/lib/storefront-reviews";

export default function ProductPageNew({ slug = "silk-veil-body-butter" }: { slug?: string }) {
  const store = useStore();
  const router = useRouter();
  const catalog = store.activeProducts.length ? store.activeProducts : seedProducts.filter((product) => product.active);
  const stored = catalog.find((item) => item.slug === slug || item.id === slug);
  const seed = seedProducts.find((item) => item.id === stored?.id);
  const base = stored
    ? {
        ...stored,
        faqs: stored.faqs?.length ? stored.faqs : seed?.faqs ?? [],
        reviews: stored.reviews?.length ? stored.reviews : [],
      }
    : stored;
  const { product: fetched, loadingDetail } = useFullProductBySlug(slug, base);
  const seedReviews = seed?.reviews ?? [];
  const liveSource = fetched ?? base;
  const liveById = new Map((liveSource?.reviews ?? []).map((review) => [review.id, review]));
  const addedReviews = (liveSource?.reviews ?? []).filter((review) => !seedReviews.some((item) => item.id === review.id));
  const product = liveSource
    ? {
        ...liveSource,
        reviews: seedReviews.length
          ? [...seedReviews.map((review) => ({ ...review, helpful: liveById.get(review.id)?.helpful ?? review.helpful })), ...addedReviews]
          : liveSource.reviews,
        faqs: liveSource.faqs?.length ? liveSource.faqs : seed?.faqs ?? [],
      }
    : liveSource;
  const categoryName = (store.categories.find((item) => item.id === product?.categoryId)?.name ?? "Body Care").toUpperCase();

  if (!product || !product.active) {
    if (!store.ready || loadingDetail) {
      return <ProductPageSkeleton />;
    }
    return (
      <p className="page-pad px-6 text-base text-[#4e4943]">
        This product is not available. <Link href="/shop" className="underline">Return to shop</Link>
      </p>
    );
  }

  return <ProductLayout product={product} categoryName={categoryName} related={catalog.filter((item) => item.id !== product.id).slice(0, 4)} onBuyNow={() => router.push("/checkout")} />;
}

function mergedReviews(primary: Review[], extra: Review[]) {
  const byId = new Map<string, Review>();
  for (const review of [...primary, ...extra]) byId.set(review.id, review);
  return [...byId.values()];
}

function priceAfterOffer(amount: number, offer?: Coupon) {
  if (!offer || amount <= 0) return amount;
  if (offer.type === "percent") return Math.max(0, Math.round(amount * (1 - offer.value / 100)));
  return Math.max(0, amount - offer.value);
}

function ProductLayout({
  product,
  categoryName,
  related,
  onBuyNow,
}: {
  product: Product;
  categoryName: string;
  related: Product[];
  onBuyNow: () => void;
}) {
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const shipping = useShippingDisplay();
  const loginHref = `/account/login?next=${encodeURIComponent(pathname || `/products/${product.slug}`)}`;
  const [activeImage, setActiveImage] = useState(0);
  const [thumbStart, setThumbStart] = useState(0);
  const [variantLabel, setVariantLabel] = useState(product.variants[0]?.label ?? "");
  const detailTabs = (
    [
      productShowsSection(product, "benefits")
        ? (["benefits", "What you'll notice", "The feel, the finish, the small daily difference."] as const)
        : null,
      productShowsSection(product, "howToUse")
        ? (["steps", "Your ritual", "A simple way to use it — morning, night, or whenever skin asks."] as const)
        : null,
      productShowsSection(product, "ingredients")
        ? (["ingredients", "What's inside", "Short formulas you can read and recognize."] as const)
        : null,
    ].filter(Boolean) as Array<readonly ["benefits" | "ingredients" | "steps", string, string]>
  );
  const [detail, setDetail] = useState<"benefits" | "ingredients" | "steps">(
    detailTabs[0]?.[0] ?? "benefits",
  );
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [helpful, setHelpful] = useState<Record<string, "yes" | "no">>({});
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});
  const [reported, setReported] = useState<Record<string, boolean>>({});
  const [writing, setWriting] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [draft, setDraft] = useState({ name: "", title: "", body: "", rating: 5 });
  const [offerId, setOfferId] = useState<string | null>(null);
  const variant = product.variants.find((item) => item.label === variantLabel) ?? product.variants[0];
  const price = variant?.price ?? product.price;

  useEffect(() => {
    if (!store.ready) return;
    // Once per product view — not on every variant toggle / re-render.
    trackViewItem({
      product,
      price: variant?.price ?? product.price,
      variantLabel: variant?.label,
      categoryName,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- product.id is the view identity
  }, [store.ready, product.id]);
  const offers = store.coupons.filter(
    (coupon) =>
      coupon.active &&
      (coupon.scope === "order" ||
        (coupon.scope === "product" && couponProductIds(coupon).includes(product.id)) ||
        (coupon.scope === "category" && coupon.categoryId === product.categoryId)),
  );
  const applied = offers.find((offer) => offer.id === offerId) ?? offers.find((offer) => offer.code === store.couponCode);
  const lineTotal = priceAfterOffer(price, applied);
  const markedPrice =
    variant?.compareAtPrice && variant.compareAtPrice > lineTotal
      ? variant.compareAtPrice
      : applied && price > lineTotal
        ? price
        : undefined;
  const offPercent = discountPercent(lineTotal, markedPrice);
  const shippingGap = shipping.freeShippingAt - lineTotal;
  const images = product.images.length ? product.images : ["/silknknot/body_butter.jpg"];
  const THUMB_WINDOW = 4;
  const maxThumbStart = Math.max(0, images.length - THUMB_WINDOW);
  const clampedThumbStart = Math.min(thumbStart, maxThumbStart);
  const visibleThumbs = images.slice(clampedThumbStart, clampedThumbStart + THUMB_WINDOW);
  const canPageThumbs = images.length > THUMB_WINDOW;
  const shiftThumbs = (direction: -1 | 1) => {
    setThumbStart((start) => Math.min(maxThumbStart, Math.max(0, start + direction)));
  };
  const descriptionImage =
    product.descriptionImage && images.includes(product.descriptionImage)
      ? product.descriptionImage
      : images[0];
  const full = Math.round(product.rating);
  const reviews = mergedReviews(product.reviews, store.reviewsFor(product.id)).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const currentUser = store.currentUser;
  const loadReviewVotes = store.loadReviewVotes;
  useEffect(() => {
    if (!currentUser) {
      setHelpful({});
      setReported({});
      return;
    }
    let ignore = false;
    void loadReviewVotes().then(({ votes, reported: ids }) => {
      if (ignore) return;
      setHelpful(votes);
      setReported(Object.fromEntries(ids.map((id) => [id, true])));
    });
    return () => {
      ignore = true;
    };
  }, [currentUser, loadReviewVotes]);

  const requireAccount = () => {
    store.notify("Log in to do that.");
    router.push(loginHref);
  };

  const castVote = (review: Review, choice: "yes" | "no") => {
    if (!store.currentUser) {
      requireAccount();
      return;
    }
    if (helpful[review.id] === choice) return;
    const previous = helpful[review.id];
    const currentCount = helpfulCounts[review.id] ?? review.helpful ?? 0;
    const nextCount = Math.max(0, currentCount + (choice === "yes" ? 1 : 0) - (previous === "yes" ? 1 : 0));
    setHelpful({ ...helpful, [review.id]: choice });
    setHelpfulCounts((counts) => ({ ...counts, [review.id]: nextCount }));
    void store.voteReview(product.id, review.id, choice).then((result) => {
      if (!result.ok) {
        setHelpful((current) => {
          const next = { ...current };
          if (previous) next[review.id] = previous;
          else delete next[review.id];
          return next;
        });
        if (result.message) store.notify(result.message);
        return;
      }
      if (typeof result.helpful === "number") {
        setHelpfulCounts((counts) => ({ ...counts, [review.id]: result.helpful as number }));
      }
    });
  };

  const report = (reviewId: string) => {
    if (!store.currentUser) {
      requireAccount();
      return;
    }
    if (reported[reviewId]) return;
    setReported((current) => ({ ...current, [reviewId]: true }));
    void store.reportReview(product.id, reviewId).then((result) => {
      if (!result.ok) {
        setReported((current) => ({ ...current, [reviewId]: false }));
        if (result.message) store.notify(result.message);
        return;
      }
      store.notify("Review reported");
    });
  };
  const reviewAverage = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : product.rating;
  const reviewBars = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => review.rating === star).length,
  }));
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 2);

  const submitReview = () => {
    if (!store.currentUser) {
      router.push(loginHref);
      return;
    }
    if (draft.title.trim().length < 3 || draft.body.trim().length < 8) {
      setReviewNote("Add a short summary and a few words about the product.");
      return;
    }
    void store.addReview(product.id, { name: store.currentUser.name, title: draft.title.trim(), body: draft.body.trim(), rating: draft.rating });
    setDraft({ name: "", title: "", body: "", rating: 5 });
    setWriting(false);
    setShowAllReviews(true);
    setReviewNote("Thank you. Your review is on the page.");
  };

  const add = (then?: () => void) => {
    if (!variant) {
      store.notify("This product has no available size.");
      return;
    }
    const result = store.addToCart(product.id, variant.label, 1);
    if (!result.ok && result.message) {
      store.notify(result.message);
      return;
    }
    if (applied) {
      const offerResult = store.applyCoupon(applied.code);
      if (offerResult.ok && offerResult.message) store.notify(offerResult.message);
    }
    if (then) then();
    else store.openCart();
  };

  return (
    <div className="bg-[#ffffff] pb-28 pt-[var(--nav-h)] text-[#2c2926] md:pb-0">
      <section className="mx-auto grid max-w-[1200px] items-start gap-6 px-4 pb-8 pt-0 md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] md:items-stretch md:gap-10 md:px-8 md:py-12">
        <div className="flex gap-3 md:h-150">
          {images.length > 1 ? (
            <div className="flex shrink-0 flex-col items-center gap-2 self-start">
              <div className="flex flex-col gap-2 py-0.5">
                {visibleThumbs.map((image, offset) => {
                  const index = clampedThumbStart + offset;
                  return (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      aria-label={`View image ${index + 1}`}
                      aria-pressed={activeImage === index}
                      onClick={() => setActiveImage(index)}
                      className={`relative size-14 shrink-0 overflow-hidden rounded-sm sm:size-16 ${
                        activeImage === index ? "border-2 border-[#c45b7a]" : "border border-[#cfcbc4]"
                      }`}
                    >
                      <Media src={image} alt={`${product.name} view ${index + 1}`} sizes="64px" className="object-contain p-1" />
                    </button>
                  );
                })}
              </div>
              {canPageThumbs ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous images"
                    disabled={clampedThumbStart <= 0}
                    onClick={() => shiftThumbs(-1)}
                    className="grid size-8 place-items-center rounded-full border border-[#d4d0c8] bg-white text-[#2c2926] hover:border-[#c45b7a] disabled:opacity-35"
                  >
                    <ChevronUp size={16} strokeWidth={1.75} aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Next images"
                    disabled={clampedThumbStart >= maxThumbStart}
                    onClick={() => shiftThumbs(1)}
                    className="grid size-8 place-items-center rounded-full border border-[#d4d0c8] bg-white text-[#2c2926] hover:border-[#c45b7a] disabled:opacity-35"
                  >
                    <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="relative min-w-0 flex-1 aspect-[5/4] max-h-[42svh] overflow-hidden rounded-xl md:aspect-auto md:max-h-none md:min-h-0">
            <Media src={images[activeImage] ?? images[0]} alt={product.name} sizes="(min-width: 1024px) 42vw, 90vw" className="object-contain p-6" />
            {product.bestseller ? <span className="absolute left-3 top-3 z-10 rounded-full bg-[#2c2926] px-3 py-1 text-xs text-white">Bestseller</span> : null}
          </div>
        </div>

        <div>
          <ProductBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Shop", href: "/shop" },
              {
                label: categoryName,
                href: `/shop?category=${encodeURIComponent(product.categoryId)}`,
              },
              { label: product.name },
            ]}
          />
          <div className="flex items-start justify-between gap-3 md:mt-2">
            <h1 className="text-4xl font-medium leading-tight md:text-5xl">{product.name}</h1>
            <WishlistButton productId={product.id} name={product.name} />
          </div>
          <p className="mt-1 hidden text-lg capitalize text-[#4e4943] md:block">{product.scent}</p>
          {SHOW_STORE_REVIEWS ? (
            <p className="mt-3 text-base text-[#3A6B75]">
              {"★".repeat(full)}
              <span className="text-[#d4d4d2]">{"★".repeat(Math.max(0, 5 - full))}</span>
              <span className="ml-2 text-[#4e4943]">{product.rating.toFixed(1)} ({product.reviewCount} reviews)</span>
            </p>
          ) : null}
          <p className="mt-4 hidden max-w-md text-base leading-7 text-[#4e4943] md:block">{product.shortDescription}</p>

          {product.variants.length ? (
            <div className="mt-6">
              <p className="text-sm text-[#4e4943]">Size</p>
              <div className="mt-2 flex flex-wrap gap-4">
                {product.variants.map((item) => (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => setVariantLabel(item.label)}
                      className={`h-10 rounded-lg border bg-white px-4 text-sm text-[#2c2926] ${item.label === variant?.label ? "border-[#2c2926]" : "border-[#e8e8e6]"}`}
                    >
                      {item.label}
                    </button>
                    <p className="mt-1 text-sm">
                      {formatPrice(priceAfterOffer(item.price, applied))}
                      {applied && priceAfterOffer(item.price, applied) < item.price ? (
                        <span className="ml-1 text-[#3A6B75] line-through">{formatPrice(item.price)}</span>
                      ) : item.compareAtPrice ? (
                        <span className="ml-1 text-[#3A6B75] line-through">{formatPrice(item.compareAtPrice)}</span>
                      ) : null}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {offers.length ? (
            <div className="mt-6">
              <p className="text-sm text-[#4e4943]">Offers</p>
              <ul className="mt-2 space-y-2">
                {offers.map((offer) => (
                  <li key={offer.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#e8e8e6] bg-white px-3 py-2">
                    <span>
                      <span className="block text-sm font-medium">{offer.label}</span>
                      <span className="text-xs tracking-[0.08em] text-[#3A6B75]">{offer.code}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (applied?.id === offer.id) {
                          setOfferId(null);
                          if (store.couponCode === offer.code) store.clearCoupon();
                          return;
                        }
                        setOfferId(offer.id);
                        const result = store.applyCoupon(offer.code);
                        if (result.ok && result.message) store.notify(result.message);
                      }}
                      className="shrink-0 text-sm text-[#3A6B75]"
                    >
                      {applied?.id === offer.id ? "Remove" : "Apply"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-medium">
            <span>{formatPrice(lineTotal)}</span>
            {applied && lineTotal < price ? (
              <span className="text-sm font-normal text-[#3A6B75] line-through">{formatPrice(price)}</span>
            ) : variant?.compareAtPrice ? (
              <span className="text-sm font-normal text-[#3A6B75] line-through">{formatPrice(variant.compareAtPrice)}</span>
            ) : null}
            {offPercent > 0 ? (
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-[#e8f5ec] px-2 py-0.5 text-xs font-bold text-[#1f7a4d]"
                aria-label={`${offPercent}% off`}
              >
                <ArrowDown size={12} strokeWidth={2.5} aria-hidden />
                {offPercent}% off
              </span>
            ) : null}
          </p>
          <div className="mt-3 hidden grid-cols-2 gap-3 md:grid">
            <button type="button" onClick={() => add()} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#61A2AF] text-base text-white hover:bg-[#4F8A96]">
              <ShoppingBag size={16} />
              Add to cart
            </button>
            <button type="button" onClick={() => add(onBuyNow)} className="flex h-12 items-center justify-center rounded-xl border border-[#2c2926] bg-white text-base text-[#2c2926] transition-colors duration-200 hover:bg-[#2c2926] hover:text-white">
              Buy it now
            </button>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-[#4e4943]">
            <Truck size={16} />
            {shippingGap > 0 ? `Add ${formatPrice(shippingGap)} more for free shipping` : "Free shipping on this order"}
          </p>
        </div>
        <DeliveryChoice />
      </section>

      <ProductClaimsStrip product={product} />

      {productShowsSection(product, "description") ? (
        <section className="mx-auto max-w-[1200px] px-4 py-14 md:px-8">
          <p className="text-sm uppercase tracking-[0.16em] text-[#6f675d]">For your skin</p>
          <h2 className="mt-2 text-lg font-medium md:text-3xl">Meet {product.name}</h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[#4e4943]">
            Not a long ingredient lecture — just what it feels like when you use it, and why it belongs in your routine.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 md:items-stretch md:min-h-[360px]">
            <div className="flex h-full flex-col justify-center rounded-xl bg-[#f7f7f6] p-6 md:p-8">
              <p className="text-base leading-7 text-[#4e4943]">{product.description}</p>
            </div>
            <div className="relative min-h-[280px] overflow-hidden rounded-xl bg-[#f7f7f6] md:min-h-full">
              <Media
                src={descriptionImage}
                alt={product.name}
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-contain p-3"
              />
            </div>
          </div>
        </section>
      ) : null}

      {detailTabs.length ? (
      <section className={`mx-auto max-w-[1200px] px-4 pb-14 md:px-8 ${productShowsSection(product, "description") ? "pt-0" : "py-14"}`}>
        <p className="text-sm uppercase tracking-[0.16em] text-[#6f675d]">Know before you buy</p>
        <h2 className="mt-2 text-lg font-medium md:text-3xl">Everything that helps you decide</h2>
        <div className="mt-8 flex gap-6 overflow-x-auto border-b border-[#efefed] text-base [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {detailTabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={detail === id} onClick={() => setDetail(id)} className={`shrink-0 pb-3 ${detail === id ? "border-b-2 border-[#2c2926] font-medium" : "text-[#6f675d]"}`}>
              {label}
            </button>
          ))}
        </div>
        {detailTabs.map(([id, , blurb]) =>
          detail === id ? (
            <p key={`${id}-blurb`} className="mt-5 max-w-2xl text-base leading-7 text-[#4e4943]">
              {blurb}
            </p>
          ) : null,
        )}
        {detail === "benefits" && productShowsSection(product, "benefits") ? (
          <ul className="mt-6 space-y-3">
            {product.benefits.filter((benefit) => benefit.trim()).map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-base text-[#2c2926]">
                <Check size={16} className="mt-1 shrink-0 text-[#3A6B75]" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {detail === "steps" && productShowsSection(product, "howToUse") ? (
          <ol className="mt-6 space-y-4">
            {product.howToUse.filter((step) => step.trim()).map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-base leading-7 text-[#2c2926]">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#61A2AF] text-sm text-white">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {detail === "ingredients" && productShowsSection(product, "ingredients") ? (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {product.ingredients.filter((item) => item.trim()).map((item) => (
              <li key={item} className="rounded-lg border border-[#efefed] bg-white px-4 py-3 text-base text-[#2c2926]">
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      ) : null}

      {SHOW_STORE_REVIEWS ? (
      <section id="customer-reviews" className="mx-auto max-w-[1200px] px-4 pb-14 md:px-8">
        <h2 className="text-lg font-medium md:text-3xl">Reviews and rating</h2>
        <div className="mt-4 grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-[#efefed] pb-6 md:max-w-xl md:gap-10">
          <div className="pr-1">
            <p className="text-4xl font-medium md:text-5xl">{reviewAverage.toFixed(1)}</p>
            <p className="mt-1 text-sm text-[#3A6B75] md:text-base">
              {"★".repeat(Math.round(reviewAverage))}
              <span className="text-[#d4d4d2]">{"★".repeat(Math.max(0, 5 - Math.round(reviewAverage)))}</span>
            </p>
            <p className="mt-1 text-xs text-[#6f675d] md:text-sm">{reviews.length} reviews</p>
          </div>
          <ul className="space-y-1.5">
            {reviewBars.map((bar) => (
              <li key={bar.star} className="grid grid-cols-[2.4rem_minmax(0,1fr)_1rem] items-center gap-2 text-xs md:grid-cols-[4.5rem_minmax(0,1fr)_2rem] md:gap-3 md:text-sm">
                <span className="whitespace-nowrap">{bar.star} ★</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-[#efefed] md:h-2">
                  <span className="block h-full rounded-full bg-[#61A2AF]" style={{ width: `${reviews.length ? (bar.count / reviews.length) * 100 : 0}%` }} />
                </span>
                <span className="text-right text-[#6f675d]">{bar.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4">
          <h2 className="whitespace-nowrap text-2xl font-medium sm:text-3xl md:text-4xl">Customer reviews</h2>
          <button
            type="button"
            onClick={() => {
              if (!store.currentUser) {
                store.notify("Log in to review this product.");
                router.push(loginHref);
                return;
              }
              setWriting((open) => !open);
            }}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[#2c2926] bg-white px-4 text-base text-[#2c2926] transition-colors duration-200 hover:bg-[#2c2926] hover:text-white"
          >
            <SquarePen size={18} />
            {writing ? "Close" : "Write a review"}
          </button>
        </div>
        {writing ? (
          <form
            className="mt-5 space-y-3 rounded-xl border border-[#efefed] bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitReview();
            }}
          >
            <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" aria-label={`${value} star`} onClick={() => setDraft({ ...draft, rating: value })} className={`text-lg ${value <= draft.rating ? "text-[#3A6B75]" : "text-[#d4d4d2]"}`}>
                  ★
                </button>
              ))}
            </div>
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Summary" className="h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base outline-none focus:border-black/40 focus:shadow-[0_0_0_1px_rgba(0,0,0,0.28)] focus-visible:outline-none" />
            <textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Your review" className="min-h-24 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-base outline-none focus:border-black/40 focus:shadow-[0_0_0_1px_rgba(0,0,0,0.28)] focus-visible:outline-none" />
            <button type="submit" className="h-11 rounded-lg bg-[#61A2AF] px-5 text-base text-white hover:bg-[#4F8A96]">
              Submit review
            </button>
            {reviewNote ? <p className="text-sm text-[#4e4943]">{reviewNote}</p> : null}
          </form>
        ) : reviewNote ? <p className="mt-3 text-sm text-[#4e4943]">{reviewNote}</p> : null}
        <ul className="mt-6 divide-y divide-[#efefed] border-y border-[#efefed]">
          {visibleReviews.map((review) => {
            const helpfulCount = helpfulCounts[review.id] ?? review.helpful ?? 0;
            const onlyYou = helpful[review.id] === "yes" && helpfulCount === 1;
            return (
            <li key={review.id} className="py-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-medium">{review.title}</h3>
                <button
                  type="button"
                  disabled={reported[review.id]}
                  onClick={() => report(review.id)}
                  className="shrink-0 text-sm text-[#6f675d] underline underline-offset-4 disabled:no-underline"
                >
                  {reported[review.id] ? "Reported" : "Report review"}
                </button>
              </div>
              <p className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-[#4e4943]">{review.name.trim() || "Anonymous"}</span>
                <span className="text-[#3A6B75]">
                  {"★".repeat(review.rating)}
                  <span className="text-[#d4d4d2]">{"★".repeat(Math.max(0, 5 - review.rating))}</span>
                </span>
              </p>
              <p className="mt-3 text-base leading-7 text-[#4e4943]">{review.body}</p>
              {helpfulCount > 0 && !onlyYou ? (
                <p className="mt-4 text-sm text-[#4e4943]">
                  {helpfulCount} {helpfulCount === 1 ? "person" : "people"} found this helpful
                </p>
              ) : null}
              <div className={`flex flex-nowrap items-center gap-2 text-sm ${helpfulCount > 0 && !onlyYou ? "mt-2" : "mt-4"}`}>
                <span className="whitespace-nowrap text-[#6f675d]">{helpful[review.id] ? "Thanks for your feedback." : "Was this helpful?"}</span>
                <button
                  type="button"
                  aria-pressed={helpful[review.id] === "yes"}
                  onClick={() => castVote(review, "yes")}
                  className={`h-8 shrink-0 rounded-full border px-3 ${helpful[review.id] === "yes" ? "border-[#61A2AF] bg-[#61A2AF] text-white" : "border-[#e8e8e6] bg-white"}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  aria-pressed={helpful[review.id] === "no"}
                  onClick={() => castVote(review, "no")}
                  className={`h-8 shrink-0 rounded-full border px-3 ${helpful[review.id] === "no" ? "border-[#2c2926] bg-[#2c2926] text-white" : "border-[#e8e8e6] bg-white"}`}
                >
                  No
                </button>
              </div>
            </li>
            );
          })}
        </ul>
        {reviews.length > 2 && !showAllReviews ? (
          <button type="button" onClick={() => setShowAllReviews(true)} className="mt-4 text-base underline underline-offset-4">
            Read all reviews
          </button>
        ) : null}
      </section>
      ) : null}

      {product.faqs.length ? (
        <section className="mx-auto max-w-[1200px] px-4 pb-14 md:px-8">
          <h2 className="text-3xl font-medium">FAQ</h2>
          <div className="mt-4 border-t border-[#efefed]">
            {product.faqs.map((faq, index) => (
              <div key={faq.question} className="border-b border-[#efefed]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 py-4 text-left text-base"
                  aria-expanded={openFaq === index}
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span>{faq.question}</span>
                  <span aria-hidden className="text-xl leading-none">{openFaq === index ? "−" : "+"}</span>
                </button>
                {openFaq === index ? <p className="pb-4 text-base leading-7 text-[#4e4943]">{faq.answer}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section className="mx-auto max-w-[1200px] px-4 pb-16 md:px-8">
          <div className="flex items-center gap-3 md:gap-5">
            <span className="h-px min-w-6 flex-1 bg-[#d9d5cf]" aria-hidden />
            <h2 className="flex shrink-0 items-center gap-2 text-center text-2xl font-medium md:gap-3 md:text-3xl">
              <Sparkles size={22} strokeWidth={1.5} className="text-[#61A2AF]" aria-hidden />
              You may also like
              <Sparkles size={22} strokeWidth={1.5} className="text-[#61A2AF]" aria-hidden />
            </h2>
            <span className="h-px min-w-6 flex-1 bg-[#d9d5cf]" aria-hidden />
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {related.map((item) => {
              const full = Math.round(item.rating);
              const variant = item.variants[0];
              const inCart = store.cart.some((line) => line.productId === item.id);
              const addRelated = () => {
                if (!variant) {
                  store.notify("This product has no available size.");
                  return;
                }
                const result = store.addToCart(item.id, variant.label, 1);
                if (!result.ok && result.message) {
                  store.notify(result.message);
                  return;
                }
                store.openCart();
              };
              return (
                <li key={item.id}>
                  <Link href={`/products/${item.slug}`} className="relative block aspect-square overflow-hidden rounded-lg bg-[#efefed]">
                    <Media src={item.images[0]} alt={item.name} sizes="(min-width: 1024px) 22vw, 46vw" className="object-cover" />
                  </Link>
                  <div className="mt-3 flex items-start gap-1">
                    <Link href={`/products/${item.slug}`} className="min-w-0 flex-1 truncate text-base font-medium">{item.name}</Link>
                    <WishlistButton productId={item.id} name={item.name} className="-mr-2 -mt-1" />
                  </div>
                  <p className="mt-1 truncate text-sm capitalize text-[#6f675d]">{item.scent}</p>
                  {SHOW_STORE_REVIEWS ? (
                    <p className="mt-2 text-sm text-[#3A6B75]">
                      {"★".repeat(full)}
                      <span className="text-[#d4d4d2]">{"★".repeat(Math.max(0, 5 - full))}</span>
                      <span className="ml-2 text-[#4e4943]">({item.reviewCount})</span>
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm">{formatPrice(item.price)}</p>
                  <button type="button" onClick={inCart ? store.openCart : addRelated} className={`mt-3 h-11 w-full rounded-full text-sm ${inCart ? "border border-[#61A2AF] bg-white text-[#2c2926]" : "bg-[#61A2AF] text-white hover:bg-[#4F8A96]"}`}>
                    {inCart ? "Go to cart" : "Add to cart"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!store.cartOpen ? (
        <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 translate-y-[var(--mobile-nav-shift,0px)] border-t border-[#efefed] bg-[#ffffff]/95 px-4 py-3 backdrop-blur transition-transform duration-200 md:bottom-0 md:hidden md:translate-y-0">
          <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-medium">
            <span className="font-medium">{formatPrice(lineTotal)}</span>
            {applied && lineTotal < price ? <span className="text-sm text-[#3A6B75] line-through">{formatPrice(price)}</span> : null}
            {offPercent > 0 ? (
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-[#e8f5ec] px-2 py-0.5 text-xs font-bold text-[#1f7a4d]"
                aria-label={`${offPercent}% off`}
              >
                <ArrowDown size={12} strokeWidth={2.5} aria-hidden />
                {offPercent}% off
              </span>
            ) : null}
            {variant ? <span className="text-[#6f675d]"> · {variant.label}</span> : null}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => add()} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#61A2AF] text-base text-white">
              <ShoppingBag size={16} />
              Add to cart
            </button>
            <button type="button" onClick={() => add(onBuyNow)} className="flex h-12 items-center justify-center rounded-xl border border-[#2c2926] bg-white text-base text-[#2c2926] transition-colors duration-200 hover:bg-[#2c2926] hover:text-white">
              Buy it now
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
