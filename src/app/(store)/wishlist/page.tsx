import { Suspense } from "react";
import { WishlistView } from "@/components/wishlist/WishlistView";

export const metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <Suspense>
      <WishlistView />
    </Suspense>
  );
}
