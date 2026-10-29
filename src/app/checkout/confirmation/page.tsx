import { Suspense } from "react";
import { Confirmation } from "@/components/checkout/Confirmation";
import { CheckoutPageSkeleton } from "@/components/storefront/PageSkeletons";

export const metadata = { title: "Confirmation" };

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<CheckoutPageSkeleton />}>
      <Confirmation />
    </Suspense>
  );
}
