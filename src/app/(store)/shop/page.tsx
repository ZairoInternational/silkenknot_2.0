import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopCatalog } from "@/components/shop/ShopCatalog";
import { ShopGridSkeleton } from "@/components/storefront/PageSkeletons";
import { shopMetadataFromSearchParams } from "@/lib/seo/metadata";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return shopMetadataFromSearchParams(await searchParams);
}

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopGridSkeleton />}>
      <ShopCatalog />
    </Suspense>
  );
}
