import Link from "next/link";
import { PolicyDoc, PolicyGlance, PolicyRows, PolicySection, PolicySteps } from "@/components/content/PolicyDoc";

export function ReturnsPolicyPage() {
  return (
    <PolicyDoc
      eyebrow="Help"
      title="Cancellation, returns & refunds"
      lede="What you can do if you need to stop an order, or if something arrives wrong."
      updated="27 Oct 2026"
      nav={[
        { id: "glance", label: "At a glance" },
        { id: "cancel", label: "Cancellation" },
        { id: "returns", label: "Returns & replacements" },
        { id: "refunds", label: "Refunds" },
        { id: "issues", label: "Damaged or wrong item" },
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
            "You can cancel from your account until your order has been sent out.",
            "After that, products are final sale for hygiene and safety.",
            "We don’t offer returns for a change of mind.",
            "If we can’t send an item you paid for, we’ll refund that item.",
            "If you paid online and cancel in time, your refund status appears on your order.",
          ]}
        />
      </div>

      <PolicySection id="cancel" title="How to cancel">
        <p>
          You can cancel an order yourself from{" "}
          <Link href="/account/orders" className="underline underline-offset-4">
            your orders
          </Link>{" "}
          as long as it hasn’t been sent out for delivery yet. Once it’s on the way, cancellation isn’t available.
        </p>
        <PolicySteps
          steps={[
            {
              title: "Open your order",
              body: "Sign in, go to Orders, and open the order you want to stop.",
            },
            {
              title: "Cancel if the option is still there",
              body: "If you can still cancel, tap Cancel on that page. If the option isn’t shown, the order has already moved too far to stop online.",
            },
            {
              title: "Watch for your refund",
              body: "If you paid online, check the same order page for your refund status. Your bank or UPI app may take a little longer to show the money back.",
            },
          ]}
        />
        <p>
          If you chose cash on delivery and cancel before the order is sent out, the order is simply stopped—nothing was charged online.
        </p>
      </PolicySection>

      <PolicySection id="returns" title="Returns & replacements">
        <p>
          Once an order has been sent out, Silken Knot products are final sale. Body care, bath, and scent products are personal-care items; we don’t take them back for hygiene and safety reasons.
        </p>
        <p>
          That means no returns for a change of mind, and no exchanges through your account. Lifestyle pieces follow the same rule unless a product page says otherwise.
        </p>
        <PolicyRows
          rows={[
            { label: "Changed my mind", value: "Not available after the order is sent out." },
            { label: "Unused product", value: "Not available after the order is sent out." },
            { label: "Wrong size", value: "We don’t offer size exchanges online." },
            { label: "Want a replacement", value: "Write to us if something arrived damaged or incorrect—we’ll help from there." },
          ]}
        />
      </PolicySection>

      <PolicySection id="refunds" title="When you get a refund">
        <p>You may receive a refund when:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>You cancel an order you already paid for, before it’s sent out.</li>
          <li>We can’t send an item you ordered.</li>
          <li>We’ve agreed a refund after you told us about a delivery problem.</li>
        </ul>
        <p>
          Refunds for online payments go back to the same method you used. You’ll see the status on your order. Your bank or UPI app may take extra time to show the credit.
        </p>
        <p>
          Cash on delivery isn’t charged until delivery, so cancelling COD early doesn’t create an online refund.
        </p>
      </PolicySection>

      <PolicySection id="issues" title="Damaged, wrong, or missing items">
        <p>
          If your parcel arrives damaged, a product isn’t right, you got the wrong item, or something is missing, please{" "}
          <Link href="/contact" className="underline underline-offset-4">
            write to us
          </Link>{" "}
          soon. It helps if you include:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Your order number</li>
          <li>What went wrong</li>
          <li>Photos of the parcel and product, if you can</li>
        </ul>
        <p>
          We’ll look into it and tell you the next step—whether that’s a refund, a replacement when we can arrange one, or another way to put it right.
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
