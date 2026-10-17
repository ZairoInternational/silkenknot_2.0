"use client";

import type { Product } from "@/lib/types";
import { LaunchCard } from "@/components/home/launches/LaunchCard";

export function LaunchShelf({ products }: { products: Product[] }) {
  return (
    <div className="mt-8 md:mt-12">
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        {products.map((product) => (
          <li key={product.id} className="min-w-0">
            <LaunchCard product={product} />
          </li>
        ))}
      </ul>
    </div>
  );
}
