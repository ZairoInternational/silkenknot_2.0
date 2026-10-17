"use client";

import { seedProducts } from "@/lib/data";
import { useStore } from "@/lib/store";
import { LaunchHeader } from "@/components/home/launches/LaunchHeader";
import { LaunchShelf } from "@/components/home/launches/LaunchShelf";

export function NewLaunches() {
  const store = useStore();
  const catalog = (store.products.length ? store.products : seedProducts).filter((product) => product.active);
  const launches = catalog
    .filter((product) => product.newArrival)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  return (
    <section aria-labelledby="new-launches-heading" className="bg-[#F7F3EE] px-5 py-14 md:px-8 md:py-20">
      <div className="mx-auto max-w-[1200px]">
        <LaunchHeader />
        {launches.length ? (
          <LaunchShelf products={launches} />
        ) : (
          <p className="mt-8 text-sm text-[#6f675d]">New arrivals will appear here when they are marked in the studio.</p>
        )}
      </div>
    </section>
  );
}
