import Link from "next/link";
import { CheckoutAuth } from "@/components/checkout/CheckoutAuth";
import { Mark } from "@/components/ui";
import "./checkout.css";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xl text-[#2c2926]">
          <Mark className="h-5 w-5" />
          Silken Knot
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-[#6f675d] md:flex" aria-label="Checkout">
          <Link href="/shop">Shop</Link>
          <Link href="/about">About</Link>
          <Link href="/shop?category=aromatherapy">Wellness</Link>
        </nav>
        <Link href="/shop" className="text-sm text-[#2c2926]">
          Back to shop
        </Link>
      </header>
      <CheckoutAuth>
        <div className="silk-checkout">{children}</div>
      </CheckoutAuth>
    </div>
  );
}
