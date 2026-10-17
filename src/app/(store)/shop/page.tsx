import { Suspense } from "react";
import { ShopCatalog } from "@/components/shop/ShopCatalog";

export const metadata = { title: "Shop" };

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="page-pad px-5 text-base text-[#4e4943]">Opening the collection…</div>}>
      <ShopCatalog />
    </Suspense>
  );
}
