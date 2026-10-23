"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Heart, Leaf, ShoppingBag, SquarePen, Truck } from "lucide-react";
import { Media, WishlistButton } from "@/components/ui";
import { DeliveryChoice } from "@/components/product/DeliveryChoice";
import { seedProducts } from "@/lib/data";
import { FREE_SHIPPING_AT, formatPrice } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Coupon, Product, Review } from "@/lib/types";
import { productShowsSection } from "@/lib/types";

export default function ProductPageNew({ slug = "silk-veil-body-butter" }: { slug?: string }) {
  const store = useStore();
  const router = useRouter();
  const catalog = store.activeProducts.length ? store.activeProducts : seedProducts.filter((product) => product.active);
  const stored = catalog.find((item) => item.slug === slug || item.id === slug);
  const seed = seedProducts.find((item) => item.id === stored?.id);
  const seedReviews = seed?.reviews ?? [];
  const liveById = new Map((stored?.reviews ?? []).map((review) => [review.id, review]));
  const addedReviews = (stored?.reviews ?? []).filter((review) => !seedReviews.some((item) => item.id === review.id));
  const product = stored
    ? {
        ...stored,
        reviews: seedReviews.length
          ? [...seedReviews.map((review) => ({ ...review, helpful: liveById.get(review.id)?.helpful ?? review.helpful })), ...addedReviews]
          : stored.reviews,
        faqs: stored.faqs?.length ? stored.faqs : seed?.faqs ?? [],
      }
    : stored;
  const categoryName = (store.categories.find((item) => item.id === product?.categoryId)?.name ?? "Body Care").toUpperCase();

  if (!product || !product.active) {
    if (!store.ready) {
      return <p className="page-pad px-6 text-base text-[#4e4943]">Opening this product…</p>;
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
  const loginHref = `/account/login?next=${encodeURIComponent(pathname || `/products/${product.slug}`)}`;
  const [activeImage, setActiveImage] = useState(0);
  const [variantLabel, setVariantLabel] = useState(product.variants[0]?.label ?? "");
  const detailTabs = (
    [
      productShowsSection(product, "description") || productShowsSection(product, "benefits")
        ? (["description", "Description"] as const)
        : null,
      productShowsSection(product, "ingredients") ? (["ingredients", "Ingredients"] as const) : null,
      productShowsSection(product, "howToUse") ? (["steps", "How to Use"] as const) : null,
    ].filter(Boolean) as Array<readonly ["description" | "ingredients" | "steps", string]>
  );
  const [detail, setDetail] = useState<"description" | "ingredients" | "steps">(
    detailTabs[0]?.[0] ?? "description",
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
  const offers = store.coupons.filter(
    (coupon) =>
      coupon.active &&
      (coupon.scope === "order" ||
        (coupon.scope === "product" && coupon.productId === product.id) ||
        (coupon.scope === "category" && coupon.categoryId === product.categoryId)),
  );
  const applied = offers.find((offer) => offer.id === offerId) ?? offers.find((offer) => offer.code === store.couponCode);
  const lineTotal = priceAfterOffer(price, applied);
  const shippingGap = FREE_SHIPPING_AT - lineTotal;
  const images = product.images.length ? product.images : ["/silknknot/body_butter.jpg"];
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
    <div className="bg-[#f6f3ee] pb-28 pt-[var(--nav-h)] text-[#2c2926] md:pb-0">
      <section className="mx-auto grid max-w-[1200px] items-start gap-6 px-4 pb-8 pt-0 md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] md:items-stretch md:gap-10 md:px-8 md:py-12">
        <div className="flex flex-col gap-3 md:h-150">
          <div className="relative aspect-[5/4] max-h-[42svh] overflow-hidden rounded-xl bg-white md:aspect-auto md:max-h-none md:min-h-0 md:flex-1">
            <Media src={images[activeImage] ?? images[0]} alt={product.name} sizes="(min-width: 1024px) 42vw, 90vw" className="object-contain p-6" />
            {product.bestseller ? <span className="absolute left-3 top-3 z-10 rounded-full border border-[#e3dbd1] bg-white px-3 py-1 text-xs text-[#2c2926]">Bestseller</span> : null}
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
              <div className="pointer-events-auto flex items-center gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Image ${index + 1}`}
                    onClick={() => setActiveImage(index)}
                    className={`h-1.5 rounded-full ${activeImage === index ? "w-6 bg-[#2c2926]" : "w-1.5 bg-[#2c2926]/35"}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                aria-label={`View image ${index + 1}`}
                onClick={() => setActiveImage(index)}
                className={`relative size-16 shrink-0 overflow-hidden rounded-md bg-white sm:size-20 ${activeImage === index ? "ring-2 ring-[#CBAC7C]" : "ring-1 ring-[#e6e0d6]"}`}
              >
                <Media src={image} alt="" sizes="80px" className="object-contain p-1" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="hidden text-xs font-medium uppercase tracking-[0.18em] text-[#8a7350] md:block">{categoryName}</p>
          <div className="flex items-start justify-between gap-3 md:mt-2">
            <h1 className="text-4xl font-medium leading-tight md:text-5xl">{product.name}</h1>
            <WishlistButton productId={product.id} name={product.name} />
          </div>
          <p className="mt-1 hidden text-lg capitalize text-[#4e4943] md:block">{product.scent}</p>
          <p className="mt-3 text-base text-[#8a7350]">
            {"★".repeat(full)}
            <span className="text-[#cfc4b6]">{"★".repeat(Math.max(0, 5 - full))}</span>
            <span className="ml-2 text-[#4e4943]">{product.rating.toFixed(1)} ({product.reviewCount} reviews)</span>
          </p>
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
                      className={`h-10 rounded-lg border bg-white px-4 text-sm text-[#2c2926] ${item.label === variant?.label ? "border-[#2c2926]" : "border-[#e3dbd1]"}`}
                    >
                      {item.label}
                    </button>
                    <p className="mt-1 text-sm">
                      {formatPrice(priceAfterOffer(item.price, applied))}
                      {applied && priceAfterOffer(item.price, applied) < item.price ? (
                        <span className="ml-1 text-[#8a7350] line-through">{formatPrice(item.price)}</span>
                      ) : item.compareAtPrice ? (
                        <span className="ml-1 text-[#8a7350] line-through">{formatPrice(item.compareAtPrice)}</span>
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
                  <li key={offer.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#e3dbd1] bg-white px-3 py-2">
                    <span>
                      <span className="block text-sm font-medium">{offer.label}</span>
                      <span className="text-xs tracking-[0.08em] text-[#8a7350]">{offer.code}</span>
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
                      className="shrink-0 text-sm text-[#8a7350]"
                    >
                      {applied?.id === offer.id ? "Applied" : "Apply"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-6 text-lg font-medium">
            {formatPrice(lineTotal)}
            {applied && lineTotal < price ? (
              <span className="ml-2 text-sm font-normal text-[#8a7350] line-through">{formatPrice(price)}</span>
            ) : variant?.compareAtPrice ? (
              <span className="ml-2 text-sm font-normal text-[#8a7350] line-through">{formatPrice(variant.compareAtPrice)}</span>
            ) : null}
          </p>
          <div className="mt-3 hidden grid-cols-2 gap-3 md:grid">
            <button type="button" onClick={() => add()} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#CBAC7C] text-base text-white hover:bg-[#B39668]">
              <ShoppingBag size={16} />
              Add to cart
            </button>
            <button type="button" onClick={() => add(onBuyNow)} className="flex h-12 items-center justify-center rounded-lg border border-[#e3dbd1] bg-white text-base text-[#4e4943]">
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

      <section className="overflow-hidden border-y border-[#e6e0d6] bg-[#fbf9f6]">
        <div className="py-6 md:hidden" aria-label="Product benefits">
          <ul className="silk-marquee flex w-max items-center">
            {[0, 1].map((copy) => (
              <li key={copy} className="flex items-center" aria-hidden={copy === 1}>
                {[
                  ["Plant-based", Leaf],
                  ["Cruelty-free", Heart],
                  ["Paraben free", Check],
                  ["Made in India", Truck],
                ].map(([label, Icon]) => (
                  <span key={String(label)} className="mx-8 inline-flex items-center gap-2 text-base font-medium text-[#2c2926]">
                    <Icon size={18} strokeWidth={1.4} className="text-[#8a7350]" />
                    {String(label)}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
        <ul className="mx-auto hidden max-w-[1200px] gap-8 px-4 py-10 sm:grid-cols-2 md:grid md:px-8 lg:grid-cols-4">
          {[
            ["Plant-based", Leaf],
            ["Cruelty-free", Heart],
            ["Paraben free", Check],
            ["Made in India", Truck],
          ].map(([label, Icon]) => (
            <li key={String(label)} className="text-center">
              <span className="mx-auto grid size-10 place-items-center text-[#8a7350]">
                <Icon size={22} strokeWidth={1.3} />
              </span>
              <h2 className="mt-3 text-base font-medium">{String(label)}</h2>
            </li>
          ))}
        </ul>
      </section>

      {detailTabs.length ? (
      <section className="mx-auto max-w-[1200px] px-4 py-14 md:px-8">
        <div className="flex gap-6 overflow-x-auto border-b border-[#e6e0d6] text-base [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {detailTabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={detail === id} onClick={() => setDetail(id)} className={`shrink-0 pb-3 ${detail === id ? "border-b-2 border-[#2c2926] font-medium" : "text-[#6f675d]"}`}>
              {label}
            </button>
          ))}
        </div>
        {detail === "description" && (productShowsSection(product, "description") || productShowsSection(product, "benefits")) ? (
          <div className="mt-8 grid items-center gap-8 lg:grid-cols-2">
            <div>
              {productShowsSection(product, "description") ? (
                <p className="max-w-xl text-base leading-7 text-[#4e4943]">{product.description}</p>
              ) : null}
              {productShowsSection(product, "benefits") ? (
                <ul className={`space-y-3 ${productShowsSection(product, "description") ? "mt-5" : ""}`}>
                  {product.benefits.filter((benefit) => benefit.trim()).map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2 text-base text-[#2c2926]">
                      <Check size={16} className="mt-1 shrink-0 text-[#8a7350]" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="relative min-h-[220px] overflow-hidden rounded-xl bg-[#eee8de]">
              <Media src={images[0]} alt={product.name} sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
          </div>
        ) : null}
        {detail === "ingredients" && productShowsSection(product, "ingredients") ? (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {product.ingredients.filter((item) => item.trim()).map((item) => (
              <li key={item} className="rounded-lg border border-[#e6e0d6] bg-white px-4 py-3 text-base text-[#2c2926]">
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        {detail === "steps" && productShowsSection(product, "howToUse") ? (
          <ol className="mt-8 space-y-4">
            {product.howToUse.filter((step) => step.trim()).map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-base leading-7 text-[#2c2926]">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#CBAC7C] text-sm text-white">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
      ) : null}

      <section id="customer-reviews" className="mx-auto max-w-[1200px] px-4 pb-14 md:px-8">
        <h2 className="text-lg font-medium md:text-3xl">Reviews and rating</h2>
        <div className="mt-4 grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-[#e6e0d6] pb-6 md:max-w-xl md:gap-10">
          <div className="pr-1">
            <p className="text-4xl font-medium md:text-5xl">{reviewAverage.toFixed(1)}</p>
            <p className="mt-1 text-sm text-[#8a7350] md:text-base">
              {"★".repeat(Math.round(reviewAverage))}
              <span className="text-[#cfc4b6]">{"★".repeat(Math.max(0, 5 - Math.round(reviewAverage)))}</span>
            </p>
            <p className="mt-1 text-xs text-[#6f675d] md:text-sm">{reviews.length} reviews</p>
          </div>
          <ul className="space-y-1.5">
            {reviewBars.map((bar) => (
              <li key={bar.star} className="grid grid-cols-[2.4rem_minmax(0,1fr)_1rem] items-center gap-2 text-xs md:grid-cols-[4.5rem_minmax(0,1fr)_2rem] md:gap-3 md:text-sm">
                <span className="whitespace-nowrap">{bar.star} ★</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-[#e6e0d6] md:h-2">
                  <span className="block h-full rounded-full bg-[#CBAC7C]" style={{ width: `${reviews.length ? (bar.count / reviews.length) * 100 : 0}%` }} />
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
            className="inline-flex shrink-0 items-center gap-2 text-base"
          >
            <SquarePen size={18} />
            {writing ? "Close" : "Write a review"}
          </button>
        </div>
        {writing ? (
          <form
            className="mt-5 space-y-3 rounded-xl border border-[#e6e0d6] bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitReview();
            }}
          >
            <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" aria-label={`${value} star`} onClick={() => setDraft({ ...draft, rating: value })} className={`text-lg ${value <= draft.rating ? "text-[#8a7350]" : "text-[#cfc4b6]"}`}>
                  ★
                </button>
              ))}
            </div>
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Summary" className="h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base outline-none focus:border-black/40 focus:shadow-[0_0_0_1px_rgba(0,0,0,0.28)] focus-visible:outline-none" />
            <textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Your review" className="min-h-24 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-base outline-none focus:border-black/40 focus:shadow-[0_0_0_1px_rgba(0,0,0,0.28)] focus-visible:outline-none" />
            <button type="submit" className="h-11 rounded-lg bg-[#CBAC7C] px-5 text-base text-white hover:bg-[#B39668]">
              Submit review
            </button>
            {reviewNote ? <p className="text-sm text-[#4e4943]">{reviewNote}</p> : null}
          </form>
        ) : reviewNote ? <p className="mt-3 text-sm text-[#4e4943]">{reviewNote}</p> : null}
        <ul className="mt-6 divide-y divide-[#e6e0d6] border-y border-[#e6e0d6]">
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
                <span className="text-[#8a7350]">
                  {"★".repeat(review.rating)}
                  <span className="text-[#cfc4b6]">{"★".repeat(Math.max(0, 5 - review.rating))}</span>
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
                  className={`h-8 shrink-0 rounded-full border px-3 ${helpful[review.id] === "yes" ? "border-[#CBAC7C] bg-[#CBAC7C] text-white" : "border-[#e3dbd1] bg-white"}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  aria-pressed={helpful[review.id] === "no"}
                  onClick={() => castVote(review, "no")}
                  className={`h-8 shrink-0 rounded-full border px-3 ${helpful[review.id] === "no" ? "border-[#2c2926] bg-[#2c2926] text-white" : "border-[#e3dbd1] bg-white"}`}
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

      {product.faqs.length ? (
        <section className="mx-auto max-w-[1200px] px-4 pb-14 md:px-8">
          <h2 className="text-3xl font-medium">FAQ</h2>
          <div className="mt-4 border-t border-[#e6e0d6]">
            {product.faqs.map((faq, index) => (
              <div key={faq.question} className="border-b border-[#e6e0d6]">
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
          <h2 className="text-3xl font-medium">You may also like</h2>
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
                  <Link href={`/products/${item.slug}`} className="relative block aspect-square overflow-hidden rounded-lg bg-[#eee8de]">
                    <Media src={item.images[0]} alt={item.name} sizes="(min-width: 1024px) 22vw, 46vw" className="object-cover" />
                  </Link>
                  <div className="mt-3 flex items-start gap-1">
                    <Link href={`/products/${item.slug}`} className="min-w-0 flex-1 truncate text-base font-medium">{item.name}</Link>
                    <WishlistButton productId={item.id} name={item.name} className="-mr-2 -mt-1" />
                  </div>
                  <p className="mt-1 truncate text-sm capitalize text-[#6f675d]">{item.scent}</p>
                  <p className="mt-2 text-sm text-[#8a7350]">
                    {"★".repeat(full)}
                    <span className="text-[#cfc4b6]">{"★".repeat(Math.max(0, 5 - full))}</span>
                    <span className="ml-2 text-[#4e4943]">({item.reviewCount})</span>
                  </p>
                  <p className="mt-2 text-sm">{formatPrice(item.price)}</p>
                  <button type="button" onClick={inCart ? store.openCart : addRelated} className={`mt-3 h-11 w-full rounded-full text-sm ${inCart ? "border border-[#CBAC7C] bg-white text-[#2c2926]" : "bg-[#CBAC7C] text-white hover:bg-[#B39668]"}`}>
                    {inCart ? "Go to cart" : "Add to cart"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!store.cartOpen ? (
        <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 translate-y-[var(--mobile-nav-shift,0px)] border-t border-[#e6e0d6] bg-[#fbf9f6]/95 px-4 py-3 backdrop-blur transition-transform duration-200 md:bottom-0 md:hidden md:translate-y-0">
          <p className="mb-2 text-lg font-medium">
            <span className="font-medium">{formatPrice(lineTotal)}</span>
            {applied && lineTotal < price ? <span className="ml-1 text-[#8a7350] line-through">{formatPrice(price)}</span> : null}
            {variant ? <span className="text-[#6f675d]"> · {variant.label}</span> : null}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => add()} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#CBAC7C] text-base text-white">
              <ShoppingBag size={16} />
              Add to cart
            </button>
            <button type="button" onClick={() => add(onBuyNow)} className="flex h-12 items-center justify-center rounded-lg border border-[#e3dbd1] bg-white text-base text-[#4e4943]">
              Buy it now
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
