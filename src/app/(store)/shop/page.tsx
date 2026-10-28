import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopCatalog } from "@/components/shop/ShopCatalog";
import { shopMetadataFromSearchParams } from "@/lib/seo/metadata";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return shopMetadataFromSearchParams(await searchParams);
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="page-pad px-5 text-base text-[#4e4943]">Opening the collection…</div>}>
      <ShopCatalog />
    </Suspense>
  );
}
