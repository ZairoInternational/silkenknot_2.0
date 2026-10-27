import Link from "next/link";
import { PolicyDoc, PolicyGlance, PolicyRows, PolicySection, PolicySteps } from "@/components/content/PolicyDoc";

export function PaymentsPolicyPage() {
  return (
    <PolicyDoc
      eyebrow="Help"
      title="Payment & pricing"
      lede="What you’ll see at checkout, how you’re charged, and what to do if a payment doesn’t go through."
      updated="27 Oct 2026"
      nav={[
        { id: "glance", label: "At a glance" },
        { id: "pricing", label: "Pricing" },
        { id: "fees", label: "Fees & offers" },
        { id: "methods", label: "Payment methods" },
        { id: "failed", label: "Failed or double payments" },
        { id: "security", label: "Security" },
      ]}
      related={[
        { href: "/returns", label: "Cancellation & refunds" },
        { href: "/shipping", label: "Shipping" },
        { href: "/privacy", label: "Privacy" },
        { href: "/contact", label: "Contact & grievance" },
      ]}
    >
      <div id="glance">
        <PolicyGlance
          items={[
            "Prices include applicable taxes.",
            "Your final total is shown clearly before you pay.",
            "You can pay online (UPI, cards, wallets) or with cash on delivery when it’s offered for your area.",
            "A small platform fee may appear on your bill—you’ll see it before you confirm.",
            "Delivery is free on eligible orders of ₹999 and above; otherwise the delivery charge for your area is shown at checkout.",
          ]}
        />
      </div>

      <PolicySection id="pricing" title="Prices you’ll see">
        <p>
          Product prices include applicable taxes. If you see a crossed-out price, the lower amount underneath is what you pay for that item before any offer or delivery charge.
        </p>
        <p>
          Before you confirm, checkout shows your items, any offer you’ve applied, delivery, and any platform fee. That total is what you pay online—or what you’ll pay when the order arrives, if you chose cash on delivery.
        </p>
        <PolicyRows
          rows={[
            { label: "Currency", value: "Indian Rupees (₹)." },
            { label: "Taxes", value: "Included in the prices shown. If you need an invoice for an order, write to us and we’ll help." },
            { label: "Delivery", value: "Shown for your area at checkout. Free on eligible orders of ₹999 and above. A faster option appears only when it’s available for you." },
          ]}
        />
      </PolicySection>

      <PolicySection id="fees" title="Offers, fees & free delivery">
        <p>
          Sometimes a <strong className="font-medium text-ink">platform fee</strong> is added at checkout. You’ll always see it on your bill before you pay. If it doesn’t apply to your order, it will show as free or won’t be charged.
        </p>
        <p>
          You can use one offer code at a time. If a code isn’t valid, we’ll let you know and remove it. The discount is reflected in the total before you pay.
        </p>
        <p>
          Free delivery applies to eligible standard delivery when your order meets the ₹999 threshold (or another threshold we show at checkout). Faster delivery, when offered, has its own charge.
        </p>
      </PolicySection>

      <PolicySection id="methods" title="How you can pay">
        <PolicyRows
          rows={[
            {
              label: "Pay online",
              value: "UPI, cards, or wallets in a secure payment window. Your order is confirmed once payment succeeds—wait for our confirmation even if your bank app shows a debit first.",
            },
            {
              label: "Cash on delivery",
              value: "Available only when it’s offered for your delivery area. Any extra delivery charge for COD is included in the total before you place the order.",
            },
          ]}
        />
        <p>
          Choose your method when you review the order. Never share OTPs, passwords, or card PINs with anyone claiming to be Silken Knot support.
        </p>
      </PolicySection>

      <PolicySection id="failed" title="If payment fails or money was deducted">
        <PolicySteps
          steps={[
            {
              title: "Check your orders",
              body: "Sign in and open Orders. If payment didn’t go through, the order usually stays unpaid or is cancelled, and nothing is sent until payment succeeds.",
            },
            {
              title: "Don’t pay twice right away",
              body: "Banks and UPI can take a moment to update. Avoid placing the same order again while a payment is still showing as pending.",
            },
            {
              title: "Write to us if you’re stuck",
              body: "If money left your account but you don’t see a paid order, contact us with the reference from your bank or UPI app.",
            },
          ]}
        />
        <p>
          For cancellations and refunds, see{" "}
          <Link href="/returns" className="underline underline-offset-4">
            Cancellation, returns & refunds
          </Link>
          .
        </p>
      </PolicySection>

      <PolicySection id="security" title="Keeping your payment safe">
        <p>
          You enter card or UPI details in a secure payment window. We don’t store your full card number, CVV, or UPI PIN. We only keep what we need to complete your order and help if something goes wrong—like your name, contact details, address, and payment confirmation.
        </p>
        <p>
          How we look after your account details is explained in our{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </PolicySection>
    </PolicyDoc>
  );
}
