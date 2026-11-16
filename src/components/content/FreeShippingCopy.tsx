"use client";

import { sharedFaqs } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { useShippingDisplay } from "@/lib/shipping/client";
import { fillFaqAnswer } from "@/lib/support/faq";

/** Renders the live free-shipping threshold from admin shipping settings. */
export function FreeShippingAmount() {
  const shipping = useShippingDisplay();
  return <>{formatPrice(shipping.freeShippingAt)}</>;
}

export function FaqAnswers() {
  const shipping = useShippingDisplay();
  const label = formatPrice(shipping.freeShippingAt);
  return (
    <>
      {sharedFaqs.map((faq) => (
        <section key={faq.question}>
          <h2 className="font-serif text-3xl text-ink">{faq.question}</h2>
          <p>{fillFaqAnswer(faq.answer, label)}</p>
        </section>
      ))}
    </>
  );
}
