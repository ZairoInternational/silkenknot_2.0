import Link from "next/link";
import { Mark } from "@/components/ui";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="flex h-16 items-center justify-between px-5 md:px-10">
        <Link href="/" className="inline-flex items-center gap-2 font-serif text-2xl">
          <Mark className="h-5 w-5" />
          Silk Knot
        </Link>
        <Link href="/shop" className="text-[11px] uppercase tracking-[0.16em]">
          Back to shop
        </Link>
      </header>
      {children}
    </div>
  );
}
