import type { Order } from "@/lib/types";
import type { SupportOrderDetail, SupportOrderSummary } from "./types";
import {
  canCustomerCancelOrder,
  supportOrderStatusLabel,
  supportOrderStory,
  supportPaymentLabel,
  supportShipmentLabel,
} from "./status-mapper";

function itemCount(order: Order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function toOrderSummary(order: Order): SupportOrderSummary {
  return {
    id: order.id,
    number: order.number,
    createdAt: order.createdAt,
    statusLabel: supportOrderStatusLabel(order),
    paymentLabel: supportPaymentLabel(order),
    total: order.total,
    itemCount: itemCount(order),
  };
}

export function toOrderDetail(order: Order): SupportOrderDetail {
  const shipment = order.shipment;
  const awb = shipment?.awb || null;
  const canRefresh = Boolean(awb);
  return {
    ...toOrderSummary(order),
    story: supportOrderStory(order),
    shipmentLabel: supportShipmentLabel(shipment?.state),
    carrier: awb ? (shipment?.provider === "delhivery" ? "Delhivery" : shipment?.provider || null) : null,
    awb,
    estimate: shipment?.estimate?.replace(/^Test · /, "") || null,
    canCancel: canCustomerCancelOrder(order),
    canRefreshTracking: canRefresh,
    trackingUrl: awb ? `https://www.delhivery.com/track/package/${awb}` : null,
    detailPath: `/orders/${order.id}`,
    paymentState: order.paymentState || null,
    paymentMethod: order.payment || null,
  };
}
