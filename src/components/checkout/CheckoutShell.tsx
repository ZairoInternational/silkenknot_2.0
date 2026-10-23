import Link from "next/link";
import { Check, LockKeyhole } from "lucide-react";

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
  return (
    <main className="checkoutPage">
      <div className="checkoutBanner">
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
        </div>
      </footer>
    </main>
  );
}
