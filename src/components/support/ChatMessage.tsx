"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { ChatMessage as Message, SupportAction } from "@/lib/support/types";
import { OrderStatusCard } from "./OrderStatusCard";
import { QuickQuestion } from "./QuickQuestion";

type Props = {
  message: Message;
  busy: boolean;
  onAction: (action: SupportAction) => void;
};

export function ChatMessageView({ message, busy, onAction }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`} data-role={message.role}>
      <div
        className={`max-w-[92%] ${
          isUser
            ? "rounded-2xl rounded-br-md bg-[#CBAC7C] px-3.5 py-2.5 text-sm text-white"
            : "rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm text-[#2c2926] shadow-[0_1px_0_rgba(44,41,38,0.04)] ring-1 ring-[#e3dbd1]"
        }`}
      >
        <p className="whitespace-pre-wrap leading-6">{message.text}</p>
        {message.loading ? (
          <p className="mt-2 text-xs text-[#8a7350]" aria-live="polite">
            <span className="inline-flex gap-1">
              <span className="size-1.5 animate-pulse rounded-full bg-[#CBAC7C]" />
              <span className="size-1.5 animate-pulse rounded-full bg-[#CBAC7C] [animation-delay:120ms]" />
              <span className="size-1.5 animate-pulse rounded-full bg-[#CBAC7C] [animation-delay:240ms]" />
            </span>
          </p>
        ) : null}
        {message.order ? <OrderStatusCard order={message.order} /> : null}
        {message.orders?.length ? (
          <ul className="mt-2 space-y-1.5">
            {message.orders.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    onAction({
                      id: "select_order",
                      label: order.number,
                      kind: "select",
                      command: "select_order",
                      orderId: order.id,
                    })
                  }
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#e3dbd1] bg-[#F7F3EE] px-3 py-2 text-left text-sm hover:border-[#CBAC7C] disabled:opacity-50"
                >
                  <span>
                    <span className="font-medium">{order.number}</span>
                    <span className="mt-0.5 block text-xs text-[#6f675d]">{formatDate(order.createdAt)}</span>
                  </span>
                  <span className="text-xs text-[#8a7350]">{order.statusLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {message.products?.length ? (
          <ul className="mt-2 space-y-1.5">
            {message.products.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    onAction({
                      id: "select_product",
                      label: product.name,
                      kind: "select",
                      command: "select_product",
                      productId: product.id,
                    })
                  }
                  className="w-full rounded-xl border border-[#e3dbd1] bg-[#F7F3EE] px-3 py-2 text-left text-sm hover:border-[#CBAC7C] disabled:opacity-50"
                >
                  {product.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {message.product ? (
          <div className="mt-2 rounded-xl border border-[#e3dbd1] bg-[#F7F3EE] p-3 text-sm">
            <p className="font-medium">{message.product.name}</p>
            {message.product.ingredients?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[#6f675d]">
                {message.product.ingredients.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {message.product.howToUse?.length ? (
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-[#6f675d]">
                {message.product.howToUse.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            ) : null}
            <Link href={message.product.href} className="mt-2 inline-block text-xs text-[#8a7350] underline underline-offset-2">
              View product
            </Link>
          </div>
        ) : null}
        {message.actions?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.actions.map((action) => (
              <QuickQuestion key={`${message.id}-${action.id}-${action.orderId || action.productId || action.href || ""}`} action={action} disabled={busy} onAction={onAction} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
