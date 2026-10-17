"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { couponDiscount, formatPrice, shippingCost, subtotal } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Address, DeliveryMethod, PaymentMethod } from "@/lib/types";
import { Field } from "@/components/ui";

const steps = ["Customer", "Address", "Delivery", "Payment", "Review"] as const;

export function CheckoutFlow() {
  const store = useStore();
  const router = useRouter();
  const user = store.currentUser;
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const saved = user?.addresses.find((item) => item.isDefault) ?? user?.addresses[0];
  const [address, setAddress] = useState<Address>(
    saved ?? {
      id: "checkout",
      label: "Home",
      name: user?.name ?? "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postal: "",
      country: "India",
      phone: user?.phone ?? "",
      isDefault: true,
    },
  );
  const [saveAddress, setSaveAddress] = useState(Boolean(user));
  const [delivery, setDelivery] = useState<DeliveryMethod>("standard");
  const [payment, setPayment] = useState<PaymentMethod>("upi");
  const [card, setCard] = useState({ name: "", number: "", expiry: "", cvc: "" });
  const [upi, setUpi] = useState("");
  const [code, setCode] = useState(store.couponCode ?? "");

  const goods = subtotal(store.cart);
  const coupon = store.coupons.find((item) => item.code === store.couponCode && item.active);
  const discount = coupon ? couponDiscount(store.cart, coupon) : 0;
  const shipping = shippingCost(Math.max(0, goods - discount), delivery);
  const total = Math.max(0, goods - discount) + shipping;

  const summary = useMemo(() => store.cart, [store.cart]);

  if (!store.ready) return <p className="px-5 py-20 text-mute">Preparing checkout…</p>;
  if (store.cart.length === 0) {
    return (
      <div className="px-5 py-20">
        <h1 className="font-serif text-5xl">Your bag is empty.</h1>
        <Link href="/shop" className="mt-6 inline-flex text-[11px] uppercase tracking-[0.18em]">Return to the collection</Link>
      </div>
    );
  }

  const next = () => {
    setError("");
    if (step === 0 && (!customer.name.trim() || !customer.email.includes("@"))) {
      setError("Add the name and email for this order.");
      return;
    }
    if (step === 1 && (!address.line1 || !address.city || !address.state || address.postal.length < 4 || !address.phone)) {
      setError("Complete the address so the studio knows where to send it.");
      return;
    }
    if (step === 3 && payment === "card" && (card.number.replace(/\s/g, "").length < 12 || card.expiry.length < 4 || card.cvc.length < 3)) {
      setError("Check the card details.");
      return;
    }
    if (step === 3 && payment === "upi" && !upi.includes("@")) {
      setError("Enter a UPI id.");
      return;
    }
    setStep((value) => Math.min(4, value + 1));
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-5 py-10 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <ol className="flex flex-wrap gap-4 text-[11px] uppercase tracking-[0.16em] text-mute">
          {steps.map((label, index) => (
            <li key={label} className={index === step ? "text-ink" : ""}>
              0{index + 1} {label}
            </li>
          ))}
        </ol>
        <h1 className="mt-6 font-serif text-5xl">{steps[step]}</h1>
        {step === 0 ? (
          <div className="mt-8 max-w-md space-y-6">
            <Field label="Name" name="name" required value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} />
            <Field label="Email" name="email" type="email" required value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} />
            <Field label="Phone" name="phone" required value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} />
            {!user ? <p className="text-sm text-mute">Already registered? <Link href="/account/login" className="underline">Log in</Link></p> : null}
          </div>
        ) : null}
        {step === 1 ? (
          <div className="mt-8 grid max-w-2xl gap-6 md:grid-cols-2">
            {user && user.addresses.length > 0 ? (
              <div className="md:col-span-2 space-y-2">
                {user.addresses.map((item) => (
                  <label key={item.id} className="flex items-start gap-3 text-sm">
                    <input type="radio" name="saved-address" checked={address.id === item.id} onChange={() => setAddress(item)} />
                    <span>{item.line1}, {item.city} {item.postal}</span>
                  </label>
                ))}
              </div>
            ) : null}
            <Field label="Address" name="line1" required value={address.line1} onChange={(event) => setAddress({ ...address, line1: event.target.value, name: customer.name, phone: customer.phone })} />
            <Field label="Apartment" name="line2" value={address.line2} onChange={(event) => setAddress({ ...address, line2: event.target.value })} />
            <Field label="City" name="city" required value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} />
            <Field label="State" name="state" required value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value })} />
            <Field label="Postal code" name="postal" required value={address.postal} onChange={(event) => setAddress({ ...address, postal: event.target.value })} />
            <Field label="Country" name="country" required value={address.country} onChange={(event) => setAddress({ ...address, country: event.target.value })} />
            {user ? (
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
                Save this address
              </label>
            ) : null}
          </div>
        ) : null}
        {step === 2 ? (
          <fieldset className="mt-8 space-y-4">
            <legend className="sr-only">Delivery</legend>
            {([
              ["standard", "Standard", "4–7 days", shippingCost(Math.max(0, goods - discount), "standard")],
              ["express", "Express", "2–4 days", 149],
            ] as const).map(([id, label, time, cost]) => (
              <label key={id} className={`flex cursor-pointer items-center justify-between border px-4 py-4 ${delivery === id ? "border-ink" : "border-line"}`}>
                <span>
                  <input className="mr-3" type="radio" name="delivery" checked={delivery === id} onChange={() => setDelivery(id)} />
                  {label}
                  <span className="mt-1 block text-sm text-mute">{time}</span>
                </span>
                <span>{cost === 0 ? "Free" : formatPrice(cost)}</span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {step === 3 ? (
          <div className="mt-8 max-w-md space-y-5">
            <p className="text-sm text-mute">Preview checkout. No payment is taken.</p>
            {(["upi", "card", "cod"] as const).map((method) => (
              <label key={method} className="flex items-center gap-3">
                <input type="radio" name="payment" checked={payment === method} onChange={() => setPayment(method)} />
                {method === "upi" ? "UPI" : method === "card" ? "Card" : "Cash on delivery"}
              </label>
            ))}
            {payment === "upi" ? <Field label="UPI id" name="upi" required value={upi} onChange={(event) => setUpi(event.target.value)} /> : null}
            {payment === "card" ? (
              <>
                <Field label="Name on card" name="card-name" required value={card.name} onChange={(event) => setCard({ ...card, name: event.target.value })} />
                <Field label="Card number" name="card-number" inputMode="numeric" autoComplete="cc-number" required value={card.number} onChange={(event) => setCard({ ...card, number: event.target.value })} />
                <Field label="Expiry" name="expiry" autoComplete="cc-exp" placeholder="MM/YY" required value={card.expiry} onChange={(event) => setCard({ ...card, expiry: event.target.value })} />
                <Field label="CVC" name="cvc" autoComplete="cc-csc" required value={card.cvc} onChange={(event) => setCard({ ...card, cvc: event.target.value })} />
              </>
            ) : null}
          </div>
        ) : null}
        {step === 4 ? (
          <div className="mt-8 space-y-4 text-sm leading-6">
            <p>{customer.name} · {customer.email} · {customer.phone}</p>
            <p>{address.line1}, {address.city}, {address.state} {address.postal}</p>
            <p className="uppercase tracking-[0.14em]">{delivery} · {payment}</p>
            <form
              className="flex max-w-sm gap-3 border-b border-line"
              onSubmit={(event) => {
                event.preventDefault();
                const result = store.applyCoupon(code);
                setError(result.ok ? "" : result.message ?? "That offer isn’t active.");
              }}
            >
              <label htmlFor="checkout-code" className="sr-only">Offer code</label>
              <input id="checkout-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Offer code" className="h-12 flex-1 bg-transparent outline-none" />
              <button type="submit" className="text-[11px] uppercase tracking-[0.16em]">Apply</button>
            </form>
          </div>
        ) : null}
        {error ? <p role="alert" className="mt-6 text-sm">{error}</p> : null}
        <div className="mt-10 flex gap-4">
          {step > 0 ? (
            <button type="button" className="h-12 px-4 text-[11px] uppercase tracking-[0.18em]" onClick={() => setStep((value) => value - 1)}>
              Back
            </button>
          ) : null}
          {step < 4 ? (
            <button type="button" className="h-12 bg-ink px-8 text-[11px] uppercase tracking-[0.2em] text-paper" onClick={next}>
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="h-12 bg-ink px-8 text-[11px] uppercase tracking-[0.2em] text-paper"
              onClick={async () => {
                if (user && saveAddress) await store.saveAddress({ ...address, name: customer.name, phone: customer.phone, isDefault: address.isDefault });
                const result = await store.placeOrder({
                  paymentId: undefined,
                  email: customer.email.trim().toLowerCase(),
                  customerName: customer.name.trim(),
                  phone: customer.phone.trim(),
                  userId: user?.id,
                  address: { ...address, name: customer.name, phone: customer.phone },
                  delivery,
                  payment,
                  items: store.cart,
                  subtotal: goods,
                  discount,
                  shipping,
                  total,
                  couponCode: coupon?.code,
                }, "legacy");
                if (!result.ok || !result.order) {
                  setError(result.message ?? "We couldn’t place that order.");
                  return;
                }
                router.push(`/checkout/confirmation?order=${result.order.id}`);
              }}
            >
              Place order
            </button>
          )}
        </div>
      </div>
      <aside className="h-fit border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-16">
        <p className="eyebrow text-mute">Your bag</p>
        <ul className="mt-4 space-y-3 text-sm">
          {summary.map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span>{item.name} · {item.variantLabel} × {item.quantity}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(goods)}</dd></div>
          {discount > 0 ? <div className="flex justify-between"><dt>Offer</dt><dd>−{formatPrice(discount)}</dd></div> : null}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : formatPrice(shipping)}</dd></div>
          <div className="flex justify-between pt-3 font-serif text-3xl"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
