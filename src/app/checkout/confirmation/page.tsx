import { Suspense } from "react";
import { Confirmation } from "@/components/checkout/Confirmation";

export const metadata = { title: "Confirmation" };

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-mute">Finding your order…</p>}>
      <Confirmation />
    </Suspense>
  );
}
