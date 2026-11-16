"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { SupportOrderDetail } from "@/lib/support/types";

export function OrderStatusCard({ order }: { order: SupportOrderDetail }) {
  return (
    <div className="mt-2 rounded-2xl border border-[#e8e8e6] bg-[#ffffff] p-3 text-sm text-[#2c2926]">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#3A6B75]">Order {order.number}</p>
      <p className="mt-1 font-medium">{order.statusLabel}</p>
      <p className="mt-1 text-[#6f675d]">{order.story}</p>
      <dl className="mt-3 grid gap-1.5 text-[13px] text-[#6f675d]">
        <div className="flex justify-between gap-3">
          <dt>Placed</dt>
          <dd className="text-[#2c2926]">{formatDate(order.createdAt)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Payment</dt>
          <dd className="text-right text-[#2c2926]">{order.paymentLabel}</dd>
        </div>
        {order.shipmentLabel ? (
          <div className="flex justify-between gap-3">
            <dt>Shipment</dt>
            <dd className="text-right text-[#2c2926]">{order.shipmentLabel}</dd>
          </div>
        ) : null}
        {order.carrier && order.awb ? (
          <div className="flex justify-between gap-3">
            <dt>{order.carrier}</dt>
            <dd className="font-mono text-[12px] text-[#2c2926]">{order.awb}</dd>
          </div>
        ) : null}
        {order.estimate ? (
          <div className="flex justify-between gap-3">
            <dt>Estimate</dt>
            <dd className="text-right text-[#2c2926]">{order.estimate}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={order.detailPath}
          className="rounded-full bg-[#61A2AF] px-3 py-1.5 text-xs text-white hover:bg-[#4F8A96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61A2AF]"
        >
          Order details
        </Link>
        {order.trackingUrl ? (
          <a
            href={order.trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#61A2AF] px-3 py-1.5 text-xs text-[#3A6B75] hover:bg-[#61A2AF] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61A2AF]"
          >
            Carrier tracking
          </a>
        ) : null}
      </div>
    </div>
  );
}
