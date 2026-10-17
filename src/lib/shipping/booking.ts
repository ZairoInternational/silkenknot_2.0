import { randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import type { Order, ShipmentRecord, TrackingEvent } from "@/lib/types";
import { paiseToRupees } from "@/lib/payments/money";
import { paymentLog } from "@/lib/payments/log";
import { getMongo } from "@/lib/mongo";
import { cancelWaybill, createManifest, DelhiveryError, fetchPackingSlip, requestPickup, trackWaybill, type LabelSize } from "./delhivery";
import { applyOverrides, policyFromEnv, type ShippingOverrides } from "./policy";
import { applyTracking, canCancelShipment } from "./states";
import { MOCK_STEPS, nextMockStep } from "./mock";

const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];

export async function loadPolicy(db?: Db) {
  const base = policyFromEnv(process.env);
  const source = db || (await getMongo()).db;
  const saved = await source.collection("storeSettings").findOne({ id: "shipping" });
  return applyOverrides(base, (saved?.overrides || null) as ShippingOverrides | null);
}

function emptyShipment(order: Order): ShipmentRecord {
  return {
    provider: "manual",
    state: "not_created",
    method: order.delivery || "standard",
    attempts: 0,
    packageData: "store_default_weight",
    weightGrams: 0,
    events: [],
  };
}

export async function enqueueShipment(orderId: string) {
  const { db } = await getMongo();
  const policy = await loadPolicy(db);
  const orders = db.collection("orders");
  const order = await orders.findOne({ id: orderId });
  if (!order) return;
  const shipment = (order.shipment as ShipmentRecord | undefined) || emptyShipment(order as unknown as Order);
  if (shipment.awb || shipment.state === "booked") return;
  if (policy.mode === "mock") {
    await createMockShipment(db, orderId, { delivery: typeof order.delivery === "string" ? order.delivery : undefined, status: typeof order.status === "string" ? order.status : undefined });
    return;
  }
  if (!policy.delhiveryEnabled || policy.bookingMode === "manual") {
    await orders.updateOne({ id: orderId }, { $set: { "shipment.provider": "manual", "shipment.state": shipment.state === "not_created" ? "not_created" : shipment.state, "shipment.method": order.delivery || "standard" } });
    return;
  }
  const now = new Date().toISOString();
  await db.collection("shipmentTasks").updateOne(
    { orderId },
    { $setOnInsert: { orderId, status: "queued", attempts: 0, nextAttemptAt: now, createdAt: now } },
    { upsert: true },
  );
  await orders.updateOne(
    { id: orderId, $or: [{ shipment: { $exists: false } }, { "shipment.state": "not_created" }, { "shipment.state": { $exists: false } }] },
    { $set: { "shipment.provider": "delhivery", "shipment.state": "pending", "shipment.method": order.delivery || "standard", "shipment.attempts": 0, "shipment.events": shipment.events || [], "shipment.packageData": shipment.packageData || "store_default_weight", "shipment.weightGrams": shipment.weightGrams > 0 ? shipment.weightGrams : policy.defaultWeightGrams } },
  );
  await bookOrder(db, orderId, false);
}

export async function processShipmentTasks(limit = 10) {
  const { db } = await getMongo();
  const now = new Date().toISOString();
  const tasks = await db.collection("shipmentTasks").find({ status: "queued", nextAttemptAt: { $lte: now } }).limit(limit).toArray();
  let booked = 0;
  for (const task of tasks) {
    const result = await bookOrder(db, String(task.orderId), false);
    if (result === "booked") booked += 1;
  }
  const tracked = await pollActiveShipments(db, limit);
  const next = await db.collection("shipmentTasks").find({ status: "queued", nextAttemptAt: { $gt: now } }).sort({ nextAttemptAt: 1 }).limit(1).next();
  if (next?.nextAttemptAt) scheduleShipmentRetry(new Date(String(next.nextAttemptAt)).getTime() - Date.now());
  paymentLog("shipment_pass", { tasks: tasks.length, booked, tracked });
  return { tasks: tasks.length, booked, tracked };
}

export async function bookOrder(db: Db, orderId: string, adminRetry: boolean): Promise<"booked" | "uncertain" | "exception" | "skipped"> {
  const orders = db.collection("orders");
  const order = await orders.findOne({ id: orderId });
  if (!order) return "skipped";
  const shipment = (order.shipment as ShipmentRecord | undefined) || emptyShipment(order as unknown as Order);
  if (shipment.awb) return "booked";
  if (shipment.state === "exception" && !adminRetry) return "exception";
  const eligible = order.payment === "cod"
    ? order.orderState === "confirmed"
    : order.paymentState === "captured";
  if (!eligible) return "skipped";
  const policy = await loadPolicy(db);
  if (!policy.liveMutationsEnabled) return "skipped";
  const claimed = await orders.updateOne(
    { id: orderId, $or: [{ "shipment.awb": { $exists: false } }, { "shipment.awb": "" }], "shipment.state": { $nin: ["booked", "cancelled", "delivered"] } },
    { $set: { "shipment.state": "pending", "shipment.bookingRequestedAt": new Date().toISOString(), "shipment.provider": "delhivery" }, $inc: { "shipment.attempts": 1 } },
  );
  if (claimed.modifiedCount !== 1) return "skipped";
  const address = order.address as { name?: string; line1?: string; line2?: string; city?: string; state?: string; postal?: string; phone?: string };
  const items = (order.items as { name?: string }[]) || [];
  try {
    const result = await createManifest(policy, {
      orderNumber: String(order.number),
      name: String(address.name || order.customerName || ""),
      address: [address.line1, address.line2].filter(Boolean).join(", "),
      city: String(address.city || ""),
      state: String(address.state || ""),
      pin: String(address.postal || ""),
      phone: String(address.phone || order.phone || ""),
      paymentMode: order.payment === "cod" ? "COD" : "Pre-paid",
      amountRupees: paiseToRupees(Number(order.amountPaise || 0)),
      codAmountRupees: order.payment === "cod" ? paiseToRupees(Number(order.amountPaise || 0)) : 0,
      weightGrams: shipment.weightGrams > 0 ? shipment.weightGrams : policy.defaultWeightGrams,
      shippingMode: order.delivery === "express" ? "Express" : "Surface",
      products: items.map((item) => item.name || "Silk Knot").join(", ") || "Silk Knot",
    });
    if ("waybill" in result) {
      await orders.updateOne({ id: orderId }, {
        $set: {
          "shipment.state": "booked",
          "shipment.awb": result.waybill,
          "shipment.reference": result.reference,
          "shipment.uncertain": false,
          "shipment.lastError": "",
          "shipment.weightGrams": shipment.weightGrams > 0 ? shipment.weightGrams : policy.defaultWeightGrams,
          "shipment.packageData": shipment.packageData || "store_default_weight",
          status: order.status === "pending_payment" ? "confirmed" : order.status,
        },
      });
      await db.collection("shipmentTasks").updateOne({ orderId }, { $set: { status: "done" } });
      paymentLog("shipment_booked", { orderId, attempts: shipment.attempts + 1 });
      return "booked";
    }
    if ("uncertain" in result) {
      await markUncertain(db, orderId, "Delhivery did not confirm the booking. It will be requested again.");
      return "uncertain";
    }
    await orders.updateOne({ id: orderId }, { $set: { "shipment.state": "exception", "shipment.lastError": result.rejected, "shipment.uncertain": false } });
    await db.collection("shipmentTasks").updateOne({ orderId }, { $set: { status: "exception", lastError: "rejected" } });
    paymentLog("shipment_rejected", { orderId });
    return "exception";
  } catch (error) {
    const kind = error instanceof DelhiveryError ? error.kind : "unavailable";
    if (kind === "config" || kind === "auth" || kind === "rejected") {
      await orders.updateOne({ id: orderId }, { $set: { "shipment.state": "exception", "shipment.lastError": error instanceof Error ? error.message : "Shipment booking failed.", "shipment.uncertain": false } });
      await db.collection("shipmentTasks").updateOne({ orderId }, { $set: { status: "exception", lastError: kind } });
      return "exception";
    }
    await markUncertain(db, orderId, "The booking request timed out or Delhivery was unavailable. It will be requested again.");
    return "uncertain";
  }
}

let retryTimer: ReturnType<typeof setTimeout> | undefined;

let retryAt = 0;

function scheduleShipmentRetry(delayMs: number) {
  const wait = Math.max(1000, delayMs);
  const at = Date.now() + wait;
  if (retryTimer && retryAt <= at) return;
  if (retryTimer) clearTimeout(retryTimer);
  retryAt = at;
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    retryAt = 0;
    void processShipmentTasks().catch((error) => {
      paymentLog("shipment_pass_failed", { code: error instanceof Error ? error.name : "error" });
    });
  }, wait);
  retryTimer.unref?.();
}

async function markUncertain(db: Db, orderId: string, message: string) {
  const task = await db.collection("shipmentTasks").findOne({ orderId });
  const attempts = Number(task?.attempts || 0) + 1;
  if (attempts > BACKOFF_MS.length) {
    await db.collection("orders").updateOne({ id: orderId }, { $set: { "shipment.state": "exception", "shipment.uncertain": false, "shipment.lastError": "Delhivery stayed unavailable. Use Retry booking." } });
    await db.collection("shipmentTasks").updateOne({ orderId }, { $set: { status: "exception", attempts, lastError: "unavailable" } });
    paymentLog("shipment_retry_exhausted", { orderId, attempts });
    return;
  }
  const delay = BACKOFF_MS[attempts - 1];
  await db.collection("orders").updateOne({ id: orderId }, { $set: { "shipment.state": "unknown", "shipment.uncertain": true, "shipment.lastError": message } });
  await db.collection("shipmentTasks").updateOne({ orderId }, { $set: { status: "queued", attempts, nextAttemptAt: new Date(Date.now() + delay).toISOString(), lastError: "uncertain" } });
  paymentLog("shipment_uncertain", { orderId, attempts, retryInMs: delay });
  scheduleShipmentRetry(delay);
}

export async function pollActiveShipments(db: Db, limit: number) {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const rows = await db.collection("orders").find({
    "shipment.awb": { $type: "string" },
    "shipment.state": { $nin: ["delivered", "cancelled", "rto_delivered", "returned"] },
    $or: [{ "shipment.lastTrackingAt": { $exists: false } }, { "shipment.lastTrackingAt": { $lt: cutoff } }],
  }).limit(limit).toArray();
  let count = 0;
  for (const row of rows) {
    await refreshTracking(db, String(row.id));
    count += 1;
  }
  return count;
}

async function createMockShipment(db: Db, orderId: string, order: { delivery?: string; status?: string }) {
  const step = MOCK_STEPS[0];
  const now = new Date().toISOString();
  const awb = `TEST${randomBytes(5).toString("hex").toUpperCase()}`;
  await db.collection("orders").updateOne({ id: orderId }, {
    $set: {
      "shipment.provider": "mock",
      "shipment.state": step.state,
      "shipment.method": order.delivery || "standard",
      "shipment.awb": awb,
      "shipment.test": true,
      "shipment.attempts": 1,
      "shipment.events": [{
        at: now,
        state: step.state,
        providerStatus: step.providerStatus,
        instructions: "Test record. Not sent to Delhivery.",
        location: "Test hub",
      }],
      "shipment.packageData": "store_default_weight",
      "shipment.weightGrams": 500,
      "shipment.estimate": "3–5 days",
      "shipment.estimateSource": "store_policy",
      "shipment.lastTrackingAt": now,
      "shipment.lastError": "",
      "shipment.uncertain": false,
      status: order.status === "pending_payment" ? "confirmed" : order.status,
    },
  });
  await db.collection("shipmentTasks").updateOne({ orderId }, { $set: { orderId, status: "test", updatedAt: now } }, { upsert: true });
  paymentLog("mock_shipment_created", { orderId });
}

async function advanceMockShipment(db: Db, orderId: string) {
  const order = await db.collection("orders").findOne({ id: orderId });
  const shipment = order?.shipment as ShipmentRecord | undefined;
  if (!order || !shipment?.test) return order;
  const step = nextMockStep(shipment.state);
  if (!step) return order;
  const now = new Date().toISOString();
  const events = [...(shipment.events || []), {
    at: now,
    state: step.state,
    providerStatus: step.providerStatus,
    instructions: "Test record. Not sent to Delhivery.",
    location: "Test hub",
  }];
  const moving = step.state === "in_transit" || step.state === "out_for_delivery";
  const fulfillment = step.state === "delivered" ? "delivered" : moving ? "shipped" : order.fulfillmentState;
  const status = step.state === "delivered" ? "delivered" : moving ? "shipped" : order.status;
  const orderState = step.state === "delivered" ? "completed" : moving ? "processing" : order.orderState;
  await db.collection("orders").updateOne({ id: orderId, "shipment.test": true }, {
    $set: {
      "shipment.state": step.state,
      "shipment.events": events.slice(-40),
      "shipment.lastTrackingAt": now,
      fulfillmentState: fulfillment,
      status,
      orderState,
    },
  });
  paymentLog("mock_shipment_advanced", { orderId, state: step.state });
  return db.collection("orders").findOne({ id: orderId });
}

export async function refreshTracking(db: Db, orderId: string) {
  const policy = await loadPolicy(db);
  const order = await db.collection("orders").findOne({ id: orderId });
  const shipment = order?.shipment as ShipmentRecord | undefined;
  if (!order || !shipment?.awb) return order;
  if (shipment.test || shipment.awb.startsWith("TEST") || (policy.mode === "mock" && shipment.provider === "mock")) {
    return advanceMockShipment(db, orderId);
  }
  if (!policy.liveReadsEnabled) return order;
  const tracked = await trackWaybill(policy, shipment.awb);
  let state = shipment.state;
  let events = shipment.events || [];
  if (!tracked.found) {
    await db.collection("orders").updateOne({ id: orderId }, { $set: { "shipment.lastTrackingAt": new Date().toISOString(), "shipment.lastError": "Tracking is not available yet." } });
    return db.collection("orders").findOne({ id: orderId });
  }
  for (const event of tracked.events) {
    const applied = applyTracking(events, state, event);
    state = applied.state;
    events = applied.events;
  }
  const fulfillment = state === "delivered" ? "delivered" : ["picked_up", "in_transit", "out_for_delivery", "delivery_failed"].includes(state) ? "shipped" : order.fulfillmentState;
  const status = state === "delivered" ? "delivered" : fulfillment === "shipped" ? "shipped" : order.status;
  const orderState = state === "delivered" ? "completed" : fulfillment === "shipped" ? "processing" : order.orderState;
  await db.collection("orders").updateOne({ id: orderId }, {
    $set: {
      "shipment.state": state,
      "shipment.events": events.slice(-40),
      "shipment.lastTrackingAt": new Date().toISOString(),
      "shipment.lastError": "",
      fulfillmentState: fulfillment,
      status,
      orderState,
    },
  });
  return db.collection("orders").findOne({ id: orderId });
}

export async function cancelShipment(db: Db, orderId: string) {
  const order = await db.collection("orders").findOne({ id: orderId });
  const shipment = order?.shipment as ShipmentRecord | undefined;
  if (!order || !shipment) throw new DelhiveryError("rejected", "This order has no shipment.");
  if (!canCancelShipment(shipment.state)) throw new DelhiveryError("rejected", "This shipment can no longer be cancelled.");
  if (shipment.awb && !shipment.test) {
    const policy = await loadPolicy(db);
    await cancelWaybill(policy, shipment.awb);
  }
  const event: TrackingEvent = { at: new Date().toISOString(), state: "cancelled", providerStatus: "Cancelled" };
  await db.collection("orders").updateOne({ id: orderId }, {
    $set: { "shipment.state": "cancelled", status: order.paymentState === "captured" ? order.status : "cancelled" },
    $push: { "shipment.events": event, audit: { at: event.at, event: "shipment_cancelled" } },
  } as never);
}

export async function shippingLabel(db: Db, orderId: string, pdfSize: LabelSize, pdf: boolean) {
  const order = await db.collection("orders").findOne({ id: orderId });
  const shipment = order?.shipment as ShipmentRecord | undefined;
  if (!shipment?.awb) throw new DelhiveryError("rejected", "Generate a waybill before preparing the shipping label.");
  if (shipment.test || shipment.awb.startsWith("TEST")) throw new DelhiveryError("rejected", "A test waybill is not sent to Delhivery.");
  const policy = await loadPolicy(db);
  return fetchPackingSlip(policy, shipment.awb, pdfSize, pdf);
}

export async function schedulePickup(db: Db, orderId: string) {
  const order = await db.collection("orders").findOne({ id: orderId });
  const shipment = order?.shipment as ShipmentRecord | undefined;
  if (!shipment?.awb || shipment.state !== "booked") throw new DelhiveryError("rejected", "Pickup can be requested after the shipment is booked.");
  if (shipment.test) {
    await advanceMockShipment(db, orderId);
    return;
  }
  const policy = await loadPolicy(db);
  const pickup = await requestPickup(policy, 1);
  await db.collection("orders").updateOne({ id: orderId }, { $set: { "shipment.state": "pickup_scheduled", "shipment.pickupDate": pickup.pickupDate } });
}

export async function createReturnManifest(db: Db, orderId: string) {
  const order = await db.collection("orders").findOne({ id: orderId });
  const shipment = order?.shipment as ShipmentRecord | undefined;
  if (!order || shipment?.state !== "delivered") throw new DelhiveryError("rejected", "A return pickup is available after delivery.");
  if (shipment.test) {
    const waybill = `TEST${randomBytes(5).toString("hex").toUpperCase()}`;
    await db.collection("orders").updateOne({ id: orderId, "shipment.test": true }, {
      $set: { "shipment.state": "return_initiated", "shipment.returnAwb": waybill, status: "return_requested" },
    });
    return waybill;
  }
  const policy = await loadPolicy(db);
  const address = order.address as { name?: string; line1?: string; line2?: string; city?: string; state?: string; postal?: string; phone?: string };
  const result = await createManifest(policy, {
    orderNumber: `RVP${String(order.number).replace(/\W/g, "").slice(0, 16)}${randomBytes(2).toString("hex")}`,
    name: String(address.name || ""),
    address: [address.line1, address.line2].filter(Boolean).join(", "),
    city: String(address.city || ""),
    state: String(address.state || ""),
    pin: String(address.postal || ""),
    phone: String(address.phone || ""),
    paymentMode: "Pickup",
    amountRupees: paiseToRupees(Number(order.amountPaise || 0)),
    codAmountRupees: 0,
    weightGrams: shipment.weightGrams || policy.defaultWeightGrams,
    shippingMode: "Surface",
    products: "Return",
  });
  if (!("waybill" in result)) throw new DelhiveryError("unavailable", "Delhivery did not confirm the return pickup.");
  await db.collection("orders").updateOne({ id: orderId }, {
    $set: { "shipment.state": "return_initiated", "shipment.returnAwb": result.waybill, status: "return_requested" },
  });
  return result.waybill;
}
