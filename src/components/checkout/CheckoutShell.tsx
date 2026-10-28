"use client";

import Link from "next/link";
import { Check, LockKeyhole } from "lucide-react";
import { useSiteMedia } from "@/lib/site-media/client";

const steps = [
  { label: "Contact", href: "/checkout" },
  { label: "Delivery", href: "/checkout/shipping" },
  { label: "Review", href: "/checkout/review" },
];

export default function CheckoutShell({
  children,
  active,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  active: number;
  title: string;
  subtitle: string;
}) {
  const media = useSiteMedia();

  return (
    <main className="checkoutPage">
      <div
        className="checkoutBanner"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(247, 243, 238, 0.94) 0%, rgba(247, 243, 238, 0.78) 46%, rgba(247, 243, 238, 0.28) 100%), url("${media.checkoutBanner}")`,
          backgroundPosition: "center right",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      >
        <p className="eyebrow">Secure checkout</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="steps">
        {steps.map((step, index) => (
          <div className={`step ${index <= active ? "stepActive" : ""}`} key={step.label}>
            <span className="stepCircle">{index < active ? <Check size={14} /> : index + 1}</span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
      <div className="secureNote">
        <LockKeyhole size={14} /> Secure checkout <span>·</span> Your details are protected
      </div>
      {children}
      <footer className="checkoutFooter">
        <span>© {new Date().getFullYear()} Silken Knot</span>
        <div>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/shipping">Shipping</Link>
          <Link href="/returns">Returns</Link>
          <Link href="/payments">Payments</Link>
        </div>
      </footer>
    </main>
  );
}
