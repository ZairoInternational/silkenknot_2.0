import { customerCanCancel, waybillListLabel } from "@/lib/shipping/states";
import type { Order, PaymentState, ShipmentState } from "@/lib/types";

/** Customer-facing order status — mirrors Screens.orderStatus without UI coupling. */
export function supportOrderStatusLabel(order: Order): string {
  const cancelled =
    order.status === "cancelled" ||
    order.orderState === "cancelled" ||
    order.shipment?.state === "cancelled" ||
    order.paymentState === "cancelled";
  if (cancelled && (order.paymentState === "refund_pending" || order.paymentState === "partially_refunded")) {
    return "Refund in progress";
  }
  if (cancelled && order.paymentState === "refunded") return "Refunded";
  if (cancelled) return "Cancelled";
  if (order.paymentState === "refund_pending" || order.paymentState === "partially_refunded") return "Refund in progress";
  if (order.paymentState === "refunded") return "Refunded";
  if (order.shipment?.awb) return waybillListLabel(order.shipment.state);
  if (order.payment === "cod" && order.orderState === "confirmed" && order.paymentState === "pending") {
    return "Confirmed · cash on delivery";
  }
  if (order.shipment?.state === "exception" || order.shipment?.state === "unknown") return "Shipment needs attention";
  if (order.shipment?.state === "out_for_delivery") return "Out for delivery";
  if (order.shipment?.state === "in_transit" || order.shipment?.state === "picked_up") return "In transit";
  if (order.fulfillmentState === "delivered" || order.status === "delivered" || order.orderState === "completed") {
    return "Delivered";
  }
  if (order.fulfillmentState === "shipped" || order.status === "shipped") return "Shipped";
  if (order.fulfillmentState === "packed" || order.status === "packed") return "Packed";
  if (order.paymentState === "failed") return "Payment failed";
  if (order.status === "pending_payment" || order.paymentState === "pending" || order.paymentState === "authorized") {
    return "Payment pending";
  }
  return "Confirmed";
}

export function supportPaymentLabel(order: Order): string {
  const state = order.paymentState;
  if (state === "failed") return "Payment failed";
  if (state === "pending" || state === "authorized") {
    return order.payment === "cod" ? "Cash on delivery · due" : "Payment pending";
  }
  if (state === "refund_pending") return "Refund in progress";
  if (state === "partially_refunded") return "Partially refunded";
  if (state === "refunded") return "Refunded";
  if (state === "cancelled") return "Payment cancelled";
  if (state === "captured") {
    if (order.payment === "cod") return "Cash on delivery";
    if (order.payment === "upi") return "Paid via UPI";
    if (order.payment === "card") return "Paid via card";
    return "Paid online";
  }
  if (order.payment === "cod") return "Cash on delivery";
  return "Payment status unavailable";
}

/** Plain-language story from recorded state — never invents courier progress. */
export function supportOrderStory(order: Order): string {
  const status = supportOrderStatusLabel(order);
  const estimate = order.shipment?.estimate?.replace(/^Test · /, "") || null;

  if (status === "Delivered") return "Your order has been delivered.";
  if (status === "Cancelled") return "This order was cancelled.";
  if (status === "Refunded") return "A full refund is shown on this order.";
  if (status === "Refund in progress") {
    return "A refund is in progress on this order. Your bank may take a little longer to show it.";
  }
  if (status === "Payment pending") {
    return "Payment is not confirmed yet. Please wait and check this status before paying again.";
  }
  if (status === "Payment failed") {
    return "Payment did not go through. Nothing ships until a successful payment is confirmed.";
  }
  if (status === "Out for delivery") return "Your order is out for delivery.";
  if (status === "In transit" || status === "Shipped") {
    return estimate ? `Your order is on its way. Expected ${estimate}.` : "Your order is on its way.";
  }
  if (status === "Delivery attempted") {
    return "Delivery was attempted. Check your order page for courier notes, or contact support.";
  }
  if (status === "Pickup scheduled") return "Pickup is scheduled for your order.";
  if (status === "Processing" || status === "Packed") {
    return estimate ? `Your order is being prepared. Expected ${estimate}.` : "Your order is being prepared.";
  }
  if (status === "Shipment needs attention" || status === "Return to origin") {
    return "The latest courier update says this shipment needs attention. Open the order or contact support.";
  }
  if (status.startsWith("Confirmed")) {
    return estimate ? `Your order is confirmed. Expected ${estimate}.` : "Your order is confirmed.";
  }
  return "Open the order page for the latest details.";
}

export function supportShipmentLabel(state?: ShipmentState | null): string | null {
  if (!state || state === "not_created") return null;
  return waybillListLabel(state);
}

export function paymentExplanation(state: PaymentState | null | undefined, method?: string): string {
  if (!state) return "Payment status is not available on this order yet.";
  if (state === "pending" || state === "authorized") {
    return method === "cod"
      ? "This is cash on delivery — payment is collected when your order arrives."
      : "Online payment is still pending. Wait for this status to update before paying again.";
  }
  if (state === "failed") return "Payment did not go through.";
  if (state === "captured") return "Payment went through successfully.";
  if (state === "refund_pending") return "A refund is pending on this order.";
  if (state === "partially_refunded") return "A partial refund is shown on this order.";
  if (state === "refunded") return "A full refund is shown on this order.";
  if (state === "cancelled") return "Payment on this order was cancelled.";
  return "See the order page for payment details.";
}

export function canCustomerCancelOrder(order: Order) {
  return customerCanCancel(order);
}
