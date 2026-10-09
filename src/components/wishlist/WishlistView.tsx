"use client";

import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { useStore } from "@/lib/store";

export function WishlistView() {
  const store = useStore();
  const products = store.products.filter((product) => store.wishlist.includes(product.id) && product.active);
  return (
    <div className="page-pad px-5 pb-24 md:px-10">
      <p className="eyebrow text-mute">Saved</p>
      <h1 className="mt-3 font-serif text-6xl">Wishlist</h1>
      {products.length === 0 ? (
        <div className="mt-10">
          <p className="max-w-md text-mute">Nothing saved yet. Hearts on a product keep it here.</p>
          <Link href="/shop" className="mt-6 inline-flex text-[11px] uppercase tracking-[0.18em]">Browse the collection</Link>
        </div>
      ) : (
        <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
              <button type="button" className="mt-3 text-[11px] uppercase tracking-[0.16em] text-mute" onClick={() => store.toggleWishlist(product.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
