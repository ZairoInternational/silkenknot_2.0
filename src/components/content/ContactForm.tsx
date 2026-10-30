"use client";

import { useState } from "react";
import Link from "next/link";
import { PolicyGlance, PolicyRows, PolicySection } from "@/components/content/PolicyDoc";

const fieldShell =
  "mt-2 flex w-full items-center rounded-xl border border-[#e3dbd1] bg-white px-3.5 transition-[border-color,box-shadow] focus-within:border-[#CBAC7C] focus-within:shadow-[0_0_0_3px_rgba(203,172,124,0.18)]";
const control =
  "h-11 w-full bg-transparent text-base text-[#2c2926] outline-none ring-0 placeholder:text-[#9a948b] focus:outline-none focus:ring-0 focus-visible:outline-none md:text-sm";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <article className="page-pad mx-auto max-w-3xl px-5 pb-24">
      <p className="eyebrow text-mute">Help</p>
      <h1 className="mt-4 font-serif text-5xl leading-[0.95] md:text-6xl">Contact & grievance</h1>
      <p className="mt-6 text-lg leading-8 text-mute">
        Write to the studio about an order, a product, or a complaint. We read every message.
      </p>
      <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-mute">Last updated · 27 Oct 2026</p>

      <nav aria-label="On this page" className="mt-10 border-y border-line py-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-mute">On this page</p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li>
            <a href="#reach" className="text-ink/80 underline-offset-4 transition hover:text-ink hover:underline">
              How to reach us
            </a>
          </li>
          <li>
            <a href="#grievance" className="text-ink/80 underline-offset-4 transition hover:text-ink hover:underline">
              Grievance redressal
            </a>
          </li>
          <li>
            <a href="#write" className="text-ink/80 underline-offset-4 transition hover:text-ink hover:underline">
              Write to us
            </a>
          </li>
        </ul>
      </nav>

      <div className="mt-10 space-y-12 leading-7 text-ink/80">
        <div id="reach" className="scroll-mt-28">
          <PolicyGlance
            items={[
              "Use this form for questions and complaints.",
              "Add your order number if you’re writing about a delivery or payment.",
              "Never share OTPs, passwords, or full card details in a message.",
              "To cancel an order that hasn’t been sent out yet, use your orders page first.",
            ]}
          />
        </div>

        <PolicySection id="grievance" title="If you have a complaint">
          <p>
            Unhappy with an order, payment, delivery, or product? Tell us with the form below. Start your message with{" "}
            <strong className="font-medium text-ink">Grievance</strong> so we know it’s a complaint.
          </p>
          <PolicyRows
            rows={[
              {
                label: "How to reach us",
                value: "This form. We’ll reply to the email you enter.",
              },
              {
                label: "What to include",
                value: "Your name, email or mobile, order number (if you have one), and what happened.",
              },
              {
                label: "Want to cancel?",
                value: "If your order hasn’t been sent out yet, cancel from your orders page when that option is still available.",
              },
              {
                label: "What happens next",
                value: "We’ll read your message and get back to you. Some issues take a little longer while we check the order.",
              },
            ]}
          />
          <p>
            You may also find answers in{" "}
            <Link href="/returns" className="underline underline-offset-4">
              Return, Refund and Replacement Policy
            </Link>
            ,{" "}
            <Link href="/payments" className="underline underline-offset-4">
              Payment & pricing
            </Link>
            , and{" "}
            <Link href="/shipping" className="underline underline-offset-4">
              Shipping
            </Link>
            .
          </p>
          <p className="text-sm text-mute">
            Complaints are handled through this form. Our studio address will appear here when it’s ready to share.
          </p>
        </PolicySection>

        <section id="write" className="scroll-mt-28">
          <h2 className="font-serif text-3xl text-ink md:text-4xl">Write to us</h2>
          <div className="mt-4">
            {sent ? (
              <p role="status" className="rounded-sm bg-cream px-5 py-6 text-ink/85">
                Received. We’ll reply to the email you entered.
              </p>
            ) : (
              <form
                className="space-y-5"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  setBusy(true);
                  setError("");
                  const response = await fetch("/api/contact", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: form.get("name"),
                      email: form.get("email"),
                      message: form.get("message"),
                    }),
                  });
                  const data = (await response.json().catch(() => null)) as { error?: string } | null;
                  setBusy(false);
                  if (!response.ok) {
                    setError(data?.error || "We couldn’t send that just now.");
                    return;
                  }
                  setSent(true);
                }}
              >
                <label className="block text-sm text-[#2c2926]" htmlFor="contact-name">
                  Name
                  <span className={fieldShell}>
                    <input
                      id="contact-name"
                      required
                      name="name"
                      autoComplete="name"
                      maxLength={80}
                      placeholder="Your name"
                      className={control}
                    />
                  </span>
                </label>
                <label className="block text-sm text-[#2c2926]" htmlFor="contact-email">
                  Email
                  <span className={fieldShell}>
                    <input
                      id="contact-email"
                      required
                      type="email"
                      name="email"
                      autoComplete="email"
                      inputMode="email"
                      maxLength={120}
                      placeholder="you@email.com"
                      className={control}
                    />
                  </span>
                </label>
                <label className="block text-sm text-[#2c2926]" htmlFor="contact-message">
                  Message
                  <span className={`${fieldShell} items-start py-2.5`}>
                    <textarea
                      id="contact-message"
                      required
                      name="message"
                      minLength={8}
                      maxLength={4000}
                      rows={5}
                      placeholder="Order number, what happened, and how we can help. For complaints, start with “Grievance”."
                      className="min-h-28 w-full resize-y bg-transparent text-base text-[#2c2926] outline-none placeholder:text-[#9a948b] md:text-sm"
                    />
                  </span>
                </label>
                {error ? (
                  <p role="alert" className="text-sm text-[#8d3b32]">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="h-12 rounded-full bg-[#CBAC7C] px-7 text-[11px] uppercase tracking-[0.18em] text-white transition hover:bg-[#B39668] disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      <aside className="mt-16 border-t border-line pt-10">
        <p className="eyebrow text-mute">Also helpful</p>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <li>
            <Link href="/faq" className="underline-offset-4 hover:underline">
              FAQ
            </Link>
          </li>
          <li>
            <Link href="/account/orders" className="underline-offset-4 hover:underline">
              Your orders
            </Link>
          </li>
          <li>
            <Link href="/returns" className="underline-offset-4 hover:underline">
              Return, Refund and Replacement Policy
            </Link>
          </li>
        </ul>
      </aside>
    </article>
  );
}
