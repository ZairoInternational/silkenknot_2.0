import { Skeleton } from "@/components/Skeleton";

export function ShopGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="page-pad px-5" aria-busy="true" aria-label="Loading collection">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="mt-3 h-4 w-72 max-w-full" style={{ backgroundColor: "#eee8de" }} />
      <div className="mt-8 grid grid-cols-2 items-stretch gap-x-3 gap-y-8 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
        {Array.from({ length: count }, (_, index) => (
          <article key={index} className="min-w-0" aria-hidden="true">
            <div className="overflow-hidden rounded-2xl bg-[#eee8de]">
              <div className="aspect-[2/3] animate-pulse bg-[#e0d8cc] md:aspect-[4/5]" />
            </div>
            <div className="space-y-2 pt-3">
              <Skeleton className="h-4 w-4/5" style={{ width: "80%" }} />
              <Skeleton className="h-4 w-1/3" style={{ width: "33%", backgroundColor: "#eee8de" }} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ProductPageSkeleton() {
  return (
    <div className="page-pad px-5 pb-24" aria-busy="true" aria-label="Loading product">
      <div className="grid gap-10 lg:grid-cols-2">
        <Skeleton className="aspect-[4/5] w-full rounded-2xl" style={{ backgroundColor: "#eee8de" }} />
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" style={{ backgroundColor: "#eee8de" }} />
          <Skeleton className="h-12 w-3/4" style={{ width: "75%" }} />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-full" style={{ backgroundColor: "#eee8de" }} />
          <Skeleton className="h-4 w-5/6" style={{ width: "83%", backgroundColor: "#eee8de" }} />
          <Skeleton className="mt-6 h-12 w-full" />
          <Skeleton className="h-12 w-full" style={{ backgroundColor: "#eee8de" }} />
        </div>
      </div>
    </div>
  );
}

export function AccountPageSkeleton() {
  return (
    <div className="page-pad px-5" aria-busy="true" aria-label="Loading account">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="mt-3 h-4 w-64" style={{ backgroundColor: "#eee8de" }} />
      <div className="mt-10 max-w-lg space-y-5">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-24" style={{ backgroundColor: "#eee8de" }} />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CheckoutPageSkeleton() {
  return (
    <div className="px-5 py-16" aria-busy="true" aria-label="Loading checkout">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="space-y-5">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" style={{ backgroundColor: "#eee8de" }} />
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
          <Skeleton className="h-12 w-40" />
        </div>
        <aside className="space-y-4 rounded-2xl border border-line bg-paper p-5">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="size-16 shrink-0 rounded-xl" style={{ backgroundColor: "#eee8de" }} />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/2" style={{ width: "50%", backgroundColor: "#eee8de" }} />
              </div>
            </div>
          ))}
          <Skeleton className="h-6 w-full" />
        </aside>
      </div>
    </div>
  );
}

export function StoreRouteSkeleton() {
  return (
    <div className="page-pad px-5 py-10" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-12 w-64 max-w-full" />
      <Skeleton className="mt-4 h-4 w-96 max-w-full" style={{ backgroundColor: "#eee8de" }} />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="aspect-[4/5] w-full rounded-2xl" style={{ backgroundColor: "#eee8de" }} />
        ))}
      </div>
    </div>
  );
}
