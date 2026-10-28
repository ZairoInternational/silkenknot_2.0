import type { Metadata } from "next";
import { Suspense } from "react";
import { WishlistView } from "@/components/wishlist/WishlistView";
import { noIndexRobots } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: noIndexRobots(),
};

export default function WishlistPage() {
  return (
    <Suspense>
      <WishlistView />
    </Suspense>
  );
}
