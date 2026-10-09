"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/product/ProductCard";
import { Media, PriceTag, Quantity, Reveal, Stars, usePrefersReducedMotion } from "@/components/ui";
import { getSeedProduct } from "@/lib/data";
import { categoryName, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export function ProductView({ slug }: { slug: string }) {
  const store = useStore();
  const product = store.ready ? store.productBySlug(slug) : getSeedProduct(slug);

  if (!product || !product.active) {
    if (!store.ready) {
      return <div className="page-pad px-5 pb-24 text-mute">Opening the piece…</div>;
    }
    return (
      <div className="page-pad px-5 pb-24">
        <h1 className="font-serif text-5xl">This piece has left the studio.</h1>
        <Link href="/shop" className="mt-6 inline-flex text-[11px] uppercase tracking-[0.18em]">
          Return to shop
        </Link>
      </div>
    );
  }

  return <ProductDetail product={product} />;
}

function ProductDetail({ product }: { product: Product }) {
  const store = useStore();
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const [image, setImage] = useState(0);
  const [origin, setOrigin] = useState("50% 50%");
  const [zoom, setZoom] = useState(false);
  const [variantLabel, setVariantLabel] = useState(product.variants[0]?.label ?? "");
  const [quantity, setQuantity] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [review, setReview] = useState({ name: store.currentUser?.name ?? "", title: "", body: "", rating: 5 });
  const [reviewNote, setReviewNote] = useState("");

  const variant = product.variants.find((item) => item.label === variantLabel) ?? product.variants[0];
  const wished = store.isWished(product.id);
  const reviews = store.reviewsFor(product.id);
  const related = store.activeProducts.filter((item) => item.categoryId === product.categoryId && item.id !== product.id).slice(0, 4);
  const soldOut = !variant || variant.stock < 1;

  const add = (thenCheckout = false) => {
    if (!variant) return;
    const result = store.addToCart(product.id, variant.label, quantity);
    if (result.message) store.notify(result.message);
    if (result.ok && thenCheckout) router.push("/checkout");
  };

  return (
    <article className="pb-28 md:pb-24">
      <div className="grid gap-10 pt-[var(--nav-h)] md:grid-cols-2 md:gap-0">
        <div className="px-5 md:px-10 md:pt-10">
          <div
            className="relative aspect-[4/5] overflow-hidden bg-cream"
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setOrigin(`${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`);
            }}
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={product.images[image]}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.01 : 0.35 }}
              >
                <Media
                  src={product.images[image]}
                  alt={`${product.name}, view ${image + 1}`}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  priority
                  className="object-contain transition duration-500"
                />
                <span
                  className="pointer-events-none absolute inset-0 hidden md:block"
                  style={{
                    backgroundImage: `url(${product.images[image]})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    transform: zoom && !reduced ? "scale(1.45)" : "scale(1)",
                    transformOrigin: origin,
                    opacity: zoom ? 1 : 0,
                    transition: "opacity 200ms ease, transform 400ms ease",
                  }}
                />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-3 flex gap-3">
            {product.images.map((src, index) => (
              <button
                key={src}
                type="button"
                aria-label={`Show image ${index + 1}`}
                aria-pressed={image === index}
                onClick={() => setImage(index)}
                className={`relative aspect-[4/5] w-16 bg-cream ${image === index ? "outline outline-1 outline-ink" : "opacity-70"}`}
              >
                <Media src={src} alt="" sizes="64px" className="object-contain" />
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 md:px-16 md:pt-16">
          <Reveal>
            <p className="eyebrow text-mute">{categoryName(product.categoryId)} · {product.type}</p>
            <h1 className="mt-3 font-serif text-5xl md:text-6xl">{product.name}</h1>
            <a href="#reviews" className="mt-4 inline-flex items-center gap-3">
              <Stars rating={product.rating} />
              <span className="text-sm text-mute">{product.reviewCount + (reviews.length - product.reviews.length)} reviews</span>
            </a>
            <div className="mt-6 text-lg">
              <PriceTag price={variant?.price ?? product.price} compare={variant?.compareAtPrice ?? product.compareAtPrice} />
            </div>
            <p className="mt-6 max-w-md text-mute">{product.shortDescription}</p>
            <fieldset className="mt-8">
              <legend className="eyebrow text-mute">{product.categoryId === "lifestyle" ? "Size" : "Size"}</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.variants.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.label === variant?.label}
                    disabled={item.stock < 1}
                    onClick={() => setVariantLabel(item.label)}
                    className={`min-w-16 border px-4 py-3 text-sm disabled:opacity-30 ${item.label === variant?.label ? "border-ink" : "border-line"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="mt-6">
              <p className="eyebrow text-mute">Quantity</p>
              <div className="mt-3">
                <Quantity value={quantity} max={variant?.stock ?? 1} onChange={setQuantity} />
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" disabled={soldOut} onClick={() => add(false)} className="h-12 bg-ink px-8 text-[11px] uppercase tracking-[0.2em] text-paper disabled:opacity-40">
                {soldOut ? "Sold out" : "Add to cart"}
              </button>
              <button type="button" disabled={soldOut} onClick={() => add(true)} className="h-12 border border-ink px-8 text-[11px] uppercase tracking-[0.2em] disabled:opacity-40">
                Buy now
              </button>
              <button
                type="button"
                aria-pressed={wished}
                aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                onClick={() => {
                  const result = store.toggleWishlist(product.id);
                  if (result.message) store.notify(result.message);
                }}
                className="inline-flex h-12 w-12 items-center justify-center border border-line"
              >
                <Heart size={16} fill={wished ? "currentColor" : "none"} />
              </button>
            </div>
            <p className="mt-4 text-sm text-mute">{variant && variant.stock < 8 ? `${variant.stock} remaining` : "Ships from the studio in India."}</p>
          </Reveal>
        </div>
      </div>

      <div className="mx-auto mt-20 max-w-3xl space-y-12 px-5">
        <section>
          <h2 className="font-serif text-4xl">Description</h2>
          <p className="mt-4 leading-7 text-mute">{product.description}</p>
        </section>
        <section>
          <h2 className="font-serif text-4xl">Benefits</h2>
          <ol className="mt-6 space-y-4">
            {product.benefits.map((benefit, index) => (
              <li key={benefit} className="grid grid-cols-[auto_1fr] gap-4">
                <span className="font-serif text-3xl text-stone">0{index + 1}</span>
                <span className="pt-2">{benefit}</span>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="font-serif text-4xl">Ingredients</h2>
          <ul className="mt-4 space-y-2 text-mute">
            {product.ingredients.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-4xl">How to use</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-mute">
            {product.howToUse.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </section>
        <section>
          <h2 className="font-serif text-4xl">Shipping</h2>
          <p className="mt-4 leading-7 text-mute">Standard delivery within India is free on orders over ₹999, otherwise ₹79. Express delivery is ₹149 and usually arrives in 2–4 days. Candles and jars are packed to travel.</p>
        </section>
        <section>
          <h2 className="font-serif text-4xl">Returns</h2>
          <p className="mt-4 leading-7 text-mute">Unopened care, soap, and candles can come back within 14 days. Apparel can be returned unworn, with tags, in the same window. Opened formulas are final.</p>
        </section>
        <section id="reviews">
          <h2 className="font-serif text-4xl">Reviews</h2>
          <ul className="mt-6 space-y-6">
            {reviews.map((item) => (
              <li key={item.id} className="border-t border-line pt-5">
                <Stars rating={item.rating} />
                <p className="mt-2 font-serif text-2xl">{item.title}</p>
                <p className="mt-2 text-mute">{item.body}</p>
                <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-mute">{item.name} · {formatDate(item.date)}</p>
              </li>
            ))}
          </ul>
          <form
            className="mt-8 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (review.title.trim().length < 3 || review.body.trim().length < 8 || review.name.trim().length < 2) {
                setReviewNote("Add your name, a title, and a few words.");
                return;
              }
              store.addReview(product.id, review);
              setReviewNote("Thank you. Your note is on the page.");
              setReview({ name: store.currentUser?.name ?? "", title: "", body: "", rating: 5 });
            }}
          >
            <p className="eyebrow text-mute">Leave a note</p>
            <label className="block text-sm">
              Name
              <input required value={review.name} onChange={(event) => setReview({ ...review, name: event.target.value })} className="mt-1 h-11 w-full border-b border-line bg-transparent outline-none" />
            </label>
            <label className="block text-sm">
              Title
              <input required value={review.title} onChange={(event) => setReview({ ...review, title: event.target.value })} className="mt-1 h-11 w-full border-b border-line bg-transparent outline-none" />
            </label>
            <label className="block text-sm">
              Review
              <textarea required value={review.body} onChange={(event) => setReview({ ...review, body: event.target.value })} className="mt-1 min-h-24 w-full border-b border-line bg-transparent outline-none" />
            </label>
            <label className="block text-sm">
              Rating
              <select value={review.rating} onChange={(event) => setReview({ ...review, rating: Number(event.target.value) })} className="mt-1 h-11 w-full border-b border-line bg-transparent outline-none">
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <button type="submit" className="text-[11px] uppercase tracking-[0.18em]">Submit review</button>
            {reviewNote ? <p role="status" className="text-sm text-mute">{reviewNote}</p> : null}
          </form>
        </section>
        <section>
          <h2 className="font-serif text-4xl">FAQs</h2>
          <div className="mt-4 divide-y divide-line">
            {product.faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div key={faq.question}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-4 text-left"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : index)}
                  >
                    <span>{faq.question}</span>
                    <span aria-hidden>{open ? "–" : "+"}</span>
                  </button>
                  {open ? <p className="pb-4 text-mute">{faq.answer}</p> : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {related.length ? (
        <section className="mt-20 px-5 md:px-10">
          <h2 className="font-serif text-4xl">Alongside it</h2>
          <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((item) => (
              <li key={item.id}><ProductCard product={item} /></li>
            ))}
          </ul>
        </section>
      ) : null}

      {!store.cartOpen ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <PriceTag price={variant?.price ?? product.price} compare={variant?.compareAtPrice} />
          <button type="button" disabled={soldOut} onClick={() => add(false)} className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper disabled:opacity-40">
            {soldOut ? "Sold out" : "Add to cart"}
          </button>
        </div>
      </div> : null}
    </article>
  );
}
