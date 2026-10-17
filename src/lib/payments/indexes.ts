import type { Db } from "mongodb";
import { paymentLog } from "@/lib/payments/log";

async function ensure(db: Db, collection: string, keys: Record<string, 1>, options: { name: string; unique?: boolean; sparse?: boolean; partialFilterExpression?: Record<string, unknown> }) {
  try {
    await db.collection(collection).createIndex(keys, options);
  } catch (error) {
    paymentLog("index_failed", { name: options.name, code: (error as { code?: number }).code || 0 });
  }
}

export async function ensurePaymentIndexes(db: Db) {
  await ensure(db, "orders", { id: 1 }, { name: "orders_id", unique: true });
  await ensure(db, "orders", { userId: 1, idempotencyKey: 1 }, {
    name: "orders_idempotency",
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  });
  await ensure(db, "orders", { razorpayOrderId: 1 }, {
    name: "orders_razorpay_order",
    unique: true,
    partialFilterExpression: { razorpayOrderId: { $type: "string" } },
  });
  await ensure(db, "orders", { razorpayPaymentId: 1 }, {
    name: "orders_razorpay_payment",
    unique: true,
    partialFilterExpression: { razorpayPaymentId: { $type: "string" } },
  });
  await ensure(db, "payments", { razorpayPaymentId: 1 }, { name: "payments_razorpay_payment", unique: true });
  await ensure(db, "webhookEvents", { eventId: 1 }, { name: "webhook_event_id", unique: true });
  await ensure(db, "orders", { "shipment.awb": 1 }, {
    name: "orders_awb",
    unique: true,
    partialFilterExpression: { "shipment.awb": { $type: "string" } },
  });
  await ensure(db, "shippingQuotes", { id: 1 }, { name: "shipping_quote_id", unique: true });
  await ensure(db, "shippingQuotes", { expiresAt: 1 }, { name: "shipping_quote_expiry" });
  await ensure(db, "shipmentTasks", { orderId: 1 }, { name: "shipment_task_order", unique: true });
  await ensure(db, "delhiveryEvents", { eventId: 1 }, { name: "delhivery_event_id", unique: true });
}
