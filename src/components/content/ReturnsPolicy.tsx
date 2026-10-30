import Link from "next/link";
import { PolicyDoc, PolicyGlance, PolicyRows, PolicySection, PolicySteps } from "@/components/content/PolicyDoc";

export function ReturnsPolicyPage() {
  return (
    <PolicyDoc
      eyebrow="Help"
      title="Cancellation, returns & refunds"
      lede="Please read this carefully. We only process returns, replacements, and refunds exactly as stated below—nothing outside these terms."
      updated="30 Oct 2026"
      nav={[
        { id: "glance", label: "At a glance" },
        { id: "cancel", label: "Cancellation & refunds" },
        { id: "returns", label: "Returns & replacements" },
        { id: "help", label: "Need help" },
      ]}
      related={[
        { href: "/payments", label: "Payment & pricing" },
        { href: "/shipping", label: "Shipping" },
        { href: "/contact", label: "Contact & grievance" },
        { href: "/terms", label: "Terms" },
      ]}
    >
      <div id="glance">
        <PolicyGlance
          items={[
            "No returns after an order has shipped.",
            "No replacements for change of mind, unused products, or preference.",
            "A refund is only available for orders paid online, and only if you cancel before the order ships.",
            "Cash on delivery is not charged until delivery—cancelling early stops the order; there is no online refund.",
            "We will not accept a return, replacement, or refund request that falls outside these terms.",
          ]}
        />
      </div>

      <PolicySection id="cancel" title="Cancellation & refunds">
        <p>
          You may cancel an order from{" "}
          <Link href="/account/orders" className="underline underline-offset-4">
            your orders
          </Link>{" "}
          only while the order has not yet shipped. Once the order has shipped, cancellation is not available.
        </p>
        <p>
          <strong>Refunds:</strong> A refund is processed only when both of the following are true:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>You paid for the order online (UPI, card, or wallet—not cash on delivery).</li>
          <li>You cancel the order before it ships.</li>
        </ul>
        <p>
          If either condition is missing, we cannot process a refund under these terms.
        </p>
        <PolicySteps
          steps={[
            {
              title: "Open your order",
              body: "Sign in, go to Orders, and open the order you want to stop.",
            },
            {
              title: "Cancel before it ships",
              body: "If Cancel is still available, use it. If the option is gone, the order has already shipped and cannot be cancelled or refunded under these terms.",
            },
            {
              title: "Online payments only",
              body: "For prepaid online orders cancelled in time, your refund status appears on the same order page. Your bank or UPI app may take extra time to show the credit. Refunds go back to the same payment method.",
            },
          ]}
        />
        <p>
          If you chose cash on delivery and cancel before the order ships, the order is simply stopped. Nothing was charged online, so there is no refund to process.
        </p>
        <p>
          If we cannot fulfil an item you already paid for online, we will refund that item to the same payment method.
        </p>
      </PolicySection>

      <PolicySection id="returns" title="Returns & replacements">
        <p>
          Silken Knot does not accept returns or replacements once an order has shipped. Body care, bath, soap, and scent products are personal-care items; for hygiene and safety we do not take them back.
        </p>
        <p>
          That means: no returns for a change of mind, no returns of unused products, and no replacements or exchanges through your account—unless a remedy is expressly allowed in these terms (for example, a prepaid cancellation refund before shipping, or a refund when we cannot fulfil an item you paid for online).
        </p>
        <PolicyRows
          rows={[
            { label: "Changed my mind", value: "Not accepted after the order has shipped. Cancel before shipping if you paid online to request a refund." },
            { label: "Unused product", value: "Not accepted." },
            { label: "Want a return", value: "Not accepted outside these terms." },
            { label: "Want a replacement", value: "Not accepted outside these terms." },
            { label: "Refund", value: "Only for online payment + cancel before the order ships (or if we cannot fulfil a prepaid item)." },
          ]}
        />
        <p>
          If your parcel arrives damaged, incomplete, or with the wrong item, please{" "}
          <Link href="/contact" className="underline underline-offset-4">
            write to us
          </Link>{" "}
          with your order number and what went wrong (photos help). We will only act within these terms—we do not accept returns, replacements, or refunds that fall outside what is stated here.
        </p>
      </PolicySection>

      <PolicySection id="help" title="Need help">
        <p>
          Check{" "}
          <Link href="/account/orders" className="underline underline-offset-4">
            your orders
          </Link>{" "}
          for status first. For anything else, use{" "}
          <Link href="/contact" className="underline underline-offset-4">
            Contact & grievance
          </Link>
          .
        </p>
      </PolicySection>
    </PolicyDoc>
  );
}
