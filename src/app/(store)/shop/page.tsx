import { Suspense } from "react";
import { ShopClient } from "@/components/shop/ShopClient";

export const metadata = { title: "Shop" };

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="page-pad px-5 text-mute">Opening the collection…</div>}>
      <ShopClient />
    </Suspense>
  );
}
