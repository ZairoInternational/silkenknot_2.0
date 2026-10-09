"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { useStore } from "@/lib/store";

export function Confirmation() {
  const params = useSearchParams();
  const store = useStore();
  const order = store.orders.find((item) => item.id === params.get("order"));
  if (!store.ready) return <p className="px-5 py-16 text-mute">Finding your order…</p>;
  if (!order) {
    return (
      <div className="px-5 py-16">
        <h1 className="font-serif text-5xl">We couldn’t find that confirmation.</h1>
        <Link href="/account/orders" className="mt-6 inline-flex underline">View orders</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <p className="eyebrow text-mute">06 · Confirmation</p>
      <h1 className="mt-3 font-serif text-6xl">It is placed.</h1>
      <p className="mt-4 text-mute">Order {order.number} is with the studio. A note would go to {order.email}.</p>
      <ul className="mt-8 space-y-2 text-sm">
        {order.items.map((item) => (
          <li key={item.id}>{item.name} · {item.variantLabel} × {item.quantity}</li>
        ))}
      </ul>
      <p className="mt-6 font-serif text-3xl">{formatPrice(order.total)}</p>
      <Link href="/shop" className="mt-8 inline-flex h-12 items-center bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper">
        Continue
      </Link>
    </div>
  );
}
