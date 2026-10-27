import { createHash, randomBytes } from "node:crypto";
import type { ClientSession, Db } from "mongodb";
import Razorpay from "razorpay";
import type { Address, CartItem, Coupon, FulfillmentState, Order, OrderStatus, PaymentState, Product } from "@/lib/types";
import type { ShippingAddress } from "@/lib/checkout";
import { paymentConfig, PaymentConfigError } from "@/lib/payments/config";
import { paymentLog } from "@/lib/payments/log";
import { paiseToRupees } from "@/lib/payments/money";
import { quoteCart, QuoteError, type Quote } from "@/lib/payments/quote";
import { checkoutSignatureValid } from "@/lib/payments/signature";
import { reserveFilter } from "@/lib/payments/inventory";
import { canRelease, fulfillmentTransition, paymentTransition } from "@/lib/payments/states";
import { getMongo } from "@/lib/mongo";
import { queueOrderConfirmation } from "@/lib/mail/notify";
import { enqueueShipment, processShipmentTasks } from "@/lib/shipping/booking";
import { ShippingQuoteError, revalidateShipping } from "@/lib/shipping/quotes";

const RESERVE_MS = 20 * 60 * 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const CREATE_LIMIT = 8;
const VERIFY_LIMIT = 30;

export class CheckoutError extends Error {
  constructor(readonly code: "config" | "invalid" | "stock" | "conflict" | "unknown" | "rate" | "forbidden", message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

export type StoredOrder = Order & {
  amountPaise: number;
  currency: "INR";
  paymentState: PaymentState;
  orderState: "pending_payment" | "confirmed" | "processing" | "cancelled" | "completed";
  inventoryState: "not_reserved" | "reserved" | "committed" | "released";
  fulfillmentState: FulfillmentState;
  idempotencyKey: string;
  requestFingerprint: string;
  providerState: "idle" | "create_requested" | "created" | "unknown";
  consistency: "transaction" | "compensating";
  updatedAt?: string;
  providerRequestedAt?: string;
  razorpayPaymentId?: string;
  audit: { at: string; event: string }[];
  refunds?: { id: string; amountPaise: number; status: "refund_pending"; reason: string; createdAt: string; razorpayRefundId?: string }[];
};

type ProviderPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
};

export function parseAddress(input: unknown): ShippingAddress {
  const row = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const phone = phoneOf(row.phone);
  const address: ShippingAddress = {
    fullName: text(row.fullName, 2, 80),
    email: text(row.email, 6, 120).toLowerCase(),
    phone,
    address1: text(row.address1, 4, 160),
    address2: typeof row.address2 === "string" ? row.address2.trim().slice(0, 160) : "",
    city: text(row.city, 2, 60),
    postalCode: text(row.postalCode, 6, 6),
    country: "India",
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) throw new CheckoutError("invalid", "Enter a valid email address.");
  if (!/^\d{6}$/.test(address.postalCode)) throw new CheckoutError("invalid", "Enter a 6-digit PIN code.");
  if (String(row.country || "India") !== "India") throw new CheckoutError("invalid", "We currently deliver within India.");
  return address;
}

function phoneOf(value: unknown) {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) throw new CheckoutError("invalid", "Enter a 10-digit mobile number.");
  return local;
}

function text(value: unknown, min: number, max: number) {
  const next = typeof value === "string" ? value.trim() : "";
  if (next.length < min || next.length > max) throw new CheckoutError("invalid", "Check the delivery details and try again.");
  return next;
}

function fingerprint(userId: string, quote: Quote, address: ShippingAddress, method: string) {
  const body = JSON.stringify({
    userId,
    method,
    amountPaise: quote.amountPaise,
    coupon: quote.couponCode || "",
    lines: quote.lines.map((line) => [line.productId, line.variantLabel, line.quantity, line.unitPaise]),
    postal: address.postalCode,
    line1: address.address1,
  });
  return createHash("sha256").update(body).digest("hex");
}

function toAddress(address: ShippingAddress): Address {
  return {
    id: "checkout",
    label: "Delivery",
    name: address.fullName,
    line1: address.address1,
    line2: address.address2 || "",
    city: address.city,
    postal: address.postalCode,
    country: address.country,
    phone: address.phone,
    isDefault: false,
  };
}

export function publicOrder(order: StoredOrder | Order): Order {
  const copy = { ...(order as StoredOrder) };
  delete (copy as { requestFingerprint?: string }).requestFingerprint;
  delete (copy as { idempotencyKey?: string }).idempotencyKey;
  delete (copy as { audit?: unknown }).audit;
  delete (copy as { _id?: unknown })._id;
  delete (copy as { providerState?: unknown }).providerState;
  return copy;
}

async function bumpRate(db: Db, userId: string, action: string, limit: number) {
  const windowStart = Math.floor(Date.now() / RATE_WINDOW_MS);
  const key = `${action}:${userId}:${windowStart}`;
  await db.collection("rateLimits").updateOne({ key }, { $inc: { count: 1 }, $setOnInsert: { key } }, { upsert: true });
  const row = await db.collection("rateLimits").findOne({ key });
  if ((row?.count || 0) > limit) throw new CheckoutError("rate", "Too many attempts. Wait a few minutes and try again.");
}

let transactionSupport: boolean | null = null;

async function transactionsEnabled() {
  if (transactionSupport !== null) return transactionSupport;
  const { client } = await getMongo();
  const session = client.startSession();
  try {
    session.startTransaction();
    await session.abortTransaction();
    transactionSupport = true;
  } catch {
    transactionSupport = false;
  } finally {
    await session.endSession();
  }
  paymentLog("transaction_support", { enabled: transactionSupport });
  return transactionSupport;
}

async function reserveLines(db: Db, lines: CartItem[], session?: ClientSession) {
  for (const line of lines) {
    const result = await db.collection("products").updateOne(
      reserveFilter(line.productId, line.variantLabel, line.quantity),
      { $inc: { "variants.$.stock": -line.quantity } },
      session ? { session } : {},
    );
    if (result.modifiedCount !== 1) throw new CheckoutError("stock", `${line.name} is no longer available.`);
  }
}

async function restoreLines(db: Db, lines: CartItem[], session?: ClientSession) {
  for (const line of lines) {
    await db.collection("products").updateOne(
      { id: line.productId, "variants.label": line.variantLabel },
      { $inc: { "variants.$.stock": line.quantity } },
      session ? { session } : {},
    );
  }
}

async function holdCoupon(db: Db, coupon: Coupon | undefined, session?: ClientSession) {
  if (!coupon?.maxRedemptions || coupon.maxRedemptions < 1) return;
  const result = await db.collection("coupons").updateOne(
    {
      id: coupon.id,
      active: true,
      $or: [{ redeemed: { $lt: coupon.maxRedemptions } }, { redeemed: { $exists: false } }],
    },
    { $inc: { redeemed: 1 } },
    session ? { session } : {},
  );
  if (result.modifiedCount !== 1) throw new CheckoutError("conflict", "This offer is no longer available.");
}

async function releaseCoupon(db: Db, code: string | undefined, session?: ClientSession) {
  if (!code) return;
  await db.collection("coupons").updateOne(
    { code, redeemed: { $gt: 0 }, maxRedemptions: { $type: "number" } },
    { $inc: { redeemed: -1 } },
    session ? { session } : {},
  );
}

export async function releaseReservation(db: Db, orderId: string, reason: string) {
  const orders = db.collection<StoredOrder>("orders");
  const order = await orders.findOne({ id: orderId });
  if (!order || !canRelease(order.inventoryState, order.paymentState)) return order;
  const { client } = await getMongo();
  const useTransaction = await transactionsEnabled();
  const run = async (session?: ClientSession) => {
    const claimed = await orders.updateOne(
      { id: orderId, inventoryState: "reserved", paymentState: { $in: ["pending", "authorized", "failed", "cancelled"] } },
      {
        $set: { inventoryState: "released", updatedAt: new Date().toISOString() },
        $push: { audit: { at: new Date().toISOString(), event: `inventory_released:${reason}` } },
      },
      session ? { session } : {},
    );
    if (claimed.modifiedCount !== 1) return;
    await restoreLines(db, order.items, session);
    await releaseCoupon(db, order.couponCode, session);
  };
  if (useTransaction) {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await run(session);
      });
    } finally {
      await session.endSession();
    }
  } else {
    await run();
  }
  paymentLog("inventory_released", { orderId, reason });
  return orders.findOne({ id: orderId });
}

async function finalizeCod(order: StoredOrder) {
  const { db } = await getMongo();
  const now = new Date().toISOString();
  const confirmed = await db.collection<StoredOrder>("orders").updateOne(
    { id: order.id, inventoryState: "reserved", paymentState: "pending" },
    {
      $set: { inventoryState: "committed", orderState: "confirmed", status: "confirmed", payment: "cod", updatedAt: now },
      $push: { audit: { at: now, event: "cod_confirmed" } },
    },
  );
  await db.collection("users").updateOne({ id: order.userId }, { $set: { savedCart: [], savedCoupon: null } });
  try {
    await enqueueShipment(order.id);
  } catch (error) {
    paymentLog("shipment_enqueue_failed", { orderId: order.id, code: error instanceof Error ? error.name : "error" });
  }
  const saved = await db.collection<StoredOrder>("orders").findOne({ id: order.id });
  if (confirmed.modifiedCount === 1 && saved) queueOrderConfirmation(saved);
  paymentLog("cod_confirmed", { orderId: order.id });
  return { cod: true as const, order: publicOrder(saved || order) };
}

function razorpay() {
  const config = paymentConfig();
  return new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
}

function definiteReject(error: unknown) {
  const status = (error as { statusCode?: number }).statusCode;
  return status === 400 || status === 401 || status === 403;
}

async function openProviderOrder(order: StoredOrder) {
  const orders = (await getMongo()).db.collection<StoredOrder>("orders");
  const claimed = await orders.updateOne(
    { id: order.id, providerState: "idle", razorpayOrderId: { $exists: false } },
    { $set: { providerState: "create_requested", providerRequestedAt: new Date().toISOString() } },
  );
  if (claimed.modifiedCount !== 1) {
    const current = await orders.findOne({ id: order.id });
    if (current?.razorpayOrderId) return current;
    throw new CheckoutError("unknown", "Payment could not be started. Check your account before trying again.");
  }
  try {
    const created = await razorpay().orders.create({
      amount: order.amountPaise,
      currency: "INR",
      receipt: order.id,
      notes: { store_order_id: order.id },
      payment_capture: true,
    });
    await orders.updateOne(
      { id: order.id },
      { $set: { razorpayOrderId: created.id, providerState: "created", updatedAt: new Date().toISOString() } },
    );
    paymentLog("razorpay_order_created", { orderId: order.id, razorpayOrderId: created.id, amountPaise: order.amountPaise });
    return orders.findOne({ id: order.id });
  } catch (error) {
    if (definiteReject(error)) {
      await releaseReservation((await getMongo()).db, order.id, "provider_rejected");
      await orders.updateOne(
        { id: order.id, paymentState: "pending" },
        { $set: { paymentState: "failed", orderState: "cancelled", status: "cancelled", providerState: "unknown", updatedAt: new Date().toISOString() } },
      );
      paymentLog("razorpay_order_rejected", { orderId: order.id, status: (error as { statusCode?: number }).statusCode || 0 });
      throw new CheckoutError("config", "Payment could not be started. Please try again.");
    }
    await orders.updateOne({ id: order.id }, { $set: { providerState: "unknown" } });
    paymentLog("razorpay_order_unknown", { orderId: order.id });
    throw new CheckoutError("unknown", "Payment could not be started. Your bag is held briefly. Check your account before paying again.");
  }
}

export async function createCheckout(input: {
  userId: string;
  email: string;
  items: unknown;
  couponCode: unknown;
  address: unknown;
  idempotencyKey: unknown;
  checkoutMethod: unknown;
  shippingQuoteId: unknown;
  shippingOptionId: unknown;
  expectedAmountPaise: unknown;
}) {
  let config;
  try {
    config = paymentConfig();
  } catch (error) {
    if (error instanceof PaymentConfigError) throw new CheckoutError("config", error.message);
    throw error;
  }
  const idempotencyKey = typeof input.idempotencyKey === "string" ? input.idempotencyKey.trim() : "";
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(idempotencyKey)) throw new CheckoutError("invalid", "Checkout could not be started. Refresh and try again.");
  const method = input.checkoutMethod === "card" ? "card" : input.checkoutMethod === "razorpay" ? "upi" : input.checkoutMethod === "cod" ? "cod" : "";
  if (!method) throw new CheckoutError("invalid", "Choose a payment method.");
  const optionId = input.shippingOptionId === "express" ? "express" : input.shippingOptionId === "standard" ? "standard" : "";
  if (!optionId || typeof input.shippingQuoteId !== "string") throw new CheckoutError("invalid", "Choose a shipping option before payment.");
  const expectedAmountPaise = Number(input.expectedAmountPaise);
  if (!Number.isInteger(expectedAmountPaise) || expectedAmountPaise < 100) throw new CheckoutError("invalid", "Review the server total before payment.");
  const address = parseAddress(input.address);
  const { db, client } = await getMongo();
  await bumpRate(db, input.userId, "checkout", CREATE_LIMIT);
  const products = (await db.collection("products").find({ active: { $ne: false } }).toArray()) as unknown as Product[];
  const coupons = (await db.collection("coupons").find({ active: true }).toArray()) as unknown as Coupon[];
  if (!products.length) throw new CheckoutError("config", "The catalog is unavailable. Nothing was charged.");
  let shippingChoice;
  try {
    shippingChoice = await revalidateShipping(db, {
      userId: input.userId,
      items: input.items,
      couponCode: String(input.couponCode || ""),
      postal: address.postalCode,
      quoteId: input.shippingQuoteId,
      optionId,
      payment: method === "cod" ? "cod" : "prepaid",
      expectedAmountPaise,
    });
  } catch (error) {
    if (error instanceof ShippingQuoteError) {
      const code = error.code === "price_changed" || error.code === "expired" ? "conflict" : error.code === "temporary" || error.code === "config" ? "unknown" : error.code === "unavailable" ? "invalid" : "invalid";
      throw new CheckoutError(code, error.message);
    }
    throw error;
  }
  let quote: Quote;
  try {
    quote = quoteCart(products, coupons, Array.isArray(input.items) ? input.items : [], String(input.couponCode || ""), {
      method: optionId,
      chargePaise: shippingChoice.selected.chargePaise,
      codFeePaise: shippingChoice.codFeePaise,
      platformFeePaise: shippingChoice.platformFeePaise,
    });
  } catch (error) {
    if (error instanceof QuoteError) throw new CheckoutError("invalid", error.message);
    throw error;
  }
  if (quote.amountPaise !== expectedAmountPaise) throw new CheckoutError("conflict", "The payable total changed. Review it before paying.");
  if (quote.amountPaise < 100) throw new CheckoutError("invalid", "The order total is too small to charge.");
  const digest = fingerprint(input.userId, quote, address, method);
  const orders = db.collection<StoredOrder>("orders");
  const existing = await orders.findOne({ userId: input.userId, idempotencyKey });
  if (existing) return replay(existing, digest);

  const now = new Date().toISOString();
  const useTransaction = await transactionsEnabled();
  if (!useTransaction && process.env.NODE_ENV === "production") {
    throw new CheckoutError("config", "Checkout requires a MongoDB replica set so stock and the order update together.");
  }
  const order: StoredOrder = {
    id: `ord_${randomBytes(16).toString("hex")}`,
    number: `SK${randomBytes(5).toString("hex").toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
    status: "pending_payment",
    email: input.email || address.email,
    customerName: address.fullName,
    phone: address.phone,
    userId: input.userId,
    address: toAddress(address),
    delivery: optionId,
    payment: method,
    items: quote.lines.map((line) => {
      const item = { ...line } as CartItem & { unitPaise?: number; linePaise?: number };
      delete item.unitPaise;
      delete item.linePaise;
      return item;
    }),
    subtotal: paiseToRupees(quote.subtotalPaise),
    discount: paiseToRupees(quote.discountPaise),
    shipping: paiseToRupees(quote.shippingPaise),
    codFee: paiseToRupees(quote.codFeePaise),
    platformFee: paiseToRupees(quote.platformFeePaise),
    total: paiseToRupees(quote.amountPaise),
    shippingLabel: shippingChoice.selected.label,
    shippingQuoteId: input.shippingQuoteId,
    codCollection: method === "cod" ? "due" : "not_applicable",
    shipment: {
      provider: shippingChoice.policy.delhiveryEnabled ? "delhivery" : "manual",
      state: "not_created",
      method: optionId,
      attempts: 0,
      packageData: shippingChoice.parcel.packageData,
      weightGrams: shippingChoice.parcel.grams,
      events: [],
      estimate: shippingChoice.selected.estimate,
      estimateSource: shippingChoice.selected.estimateSource,
    },
    couponCode: quote.couponCode,
    amountPaise: quote.amountPaise,
    currency: "INR",
    paymentState: "pending",
    orderState: "pending_payment",
    inventoryState: "not_reserved",
    fulfillmentState: "unfulfilled",
    idempotencyKey,
    requestFingerprint: digest,
    providerState: "idle",
    consistency: useTransaction ? "transaction" : "compensating",
    reserveExpiresAt: new Date(Date.now() + RESERVE_MS).toISOString(),
    audit: [{ at: now, event: "checkout_created" }],
  } as StoredOrder;

  try {
    await orders.insertOne(order);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      const raced = await orders.findOne({ userId: input.userId, idempotencyKey });
      if (raced) return replay(raced, digest);
    }
    throw error;
  }

  const coupon = quote.couponCode ? coupons.find((item) => item.code === quote.couponCode) : undefined;
  try {
    if (useTransaction) {
      const session = client.startSession();
      try {
        await session.withTransaction(async () => {
          await reserveLines(db, order.items, session);
          await holdCoupon(db, coupon, session);
          const reserved = await orders.updateOne(
            { id: order.id, inventoryState: "not_reserved" },
            { $set: { inventoryState: "reserved" }, $push: { audit: { at: new Date().toISOString(), event: "inventory_reserved" } } },
            { session },
          );
          if (reserved.modifiedCount !== 1) throw new CheckoutError("conflict", "Checkout could not reserve the bag.");
        });
      } finally {
        await session.endSession();
      }
    } else {
      const held: CartItem[] = [];
      try {
        for (const line of order.items) {
          const result = await db.collection("products").updateOne(
            reserveFilter(line.productId, line.variantLabel, line.quantity),
            { $inc: { "variants.$.stock": -line.quantity } },
          );
          if (result.modifiedCount !== 1) throw new CheckoutError("stock", `${line.name} is no longer available.`);
          held.push(line);
        }
        await holdCoupon(db, coupon);
      } catch (error) {
        if (held.length) await restoreLines(db, held);
        await releaseCoupon(db, order.couponCode);
        throw error;
      }
      const marked = await orders.updateOne(
        { id: order.id, inventoryState: "not_reserved" },
        { $set: { inventoryState: "reserved", consistency: "compensating" }, $push: { audit: { at: new Date().toISOString(), event: "inventory_reserved" } } },
      );
      if (marked.modifiedCount !== 1) {
        await restoreLines(db, order.items);
        await releaseCoupon(db, order.couponCode);
        throw new CheckoutError("conflict", "Checkout could not reserve the bag.");
      }
    }
  } catch (error) {
    await orders.updateOne(
      { id: order.id, inventoryState: "not_reserved" },
      { $set: { inventoryState: "released", paymentState: "failed", orderState: "cancelled", status: "cancelled" } },
    );
    if (error instanceof CheckoutError) throw error;
    throw new CheckoutError("stock", "Those items are no longer available.");
  }

  const reserved = await orders.findOne({ id: order.id });
  if (!reserved) throw new CheckoutError("unknown", "Checkout could not be saved.");
  if (method === "cod") return finalizeCod(reserved);
  const opened = await openProviderOrder(reserved);
  if (!opened?.razorpayOrderId) throw new CheckoutError("unknown", "Payment could not be started.");
  paymentLog("checkout_ready", { orderId: opened.id, amountPaise: opened.amountPaise, consistency: opened.consistency });
  return {
    orderId: opened.id,
    amount: opened.amountPaise,
    currency: "INR" as const,
    razorpayOrderId: opened.razorpayOrderId,
    keyId: config.keyId,
    subtotal: opened.subtotal,
    discount: opened.discount,
    shipping: opened.shipping,
    total: opened.total,
    couponCode: opened.couponCode,
  };
}

async function abandonReplacedCheckout(order: StoredOrder) {
  if (order.paymentState === "captured" || order.orderState === "confirmed" || order.inventoryState === "committed") return;
  const { db } = await getMongo();
  if (order.inventoryState === "reserved") await releaseReservation(db, order.id, "checkout_replaced");
  await db.collection<StoredOrder>("orders").updateOne(
    { id: order.id, orderState: { $ne: "confirmed" }, paymentState: { $in: ["pending", "failed", "cancelled"] } },
    { $set: { paymentState: "cancelled", orderState: "cancelled", status: "cancelled", updatedAt: new Date().toISOString() } },
  );
}

async function replay(order: StoredOrder, digest: string) {
  if (order.requestFingerprint !== digest) {
    try {
      await abandonReplacedCheckout(order);
    } catch (error) {
      paymentLog("checkout_replace_failed", { orderId: order.id, message: error instanceof Error ? error.name : "error" });
    }
    throw new CheckoutError("conflict", "This checkout attempt does not match the bag. Start again.");
  }
  if (order.paymentState === "captured" || order.orderState === "confirmed") {
    if (order.payment === "cod") return { cod: true as const, order: publicOrder(order) };
    return { alreadyPaid: true as const, order: publicOrder(order) };
  }
  if (order.razorpayOrderId && order.inventoryState === "reserved" && order.paymentState !== "failed" && order.paymentState !== "cancelled") {
    const config = paymentConfig();
    return {
      orderId: order.id,
      amount: order.amountPaise,
      currency: "INR" as const,
      razorpayOrderId: order.razorpayOrderId,
      keyId: config.keyId,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      total: order.total,
      couponCode: order.couponCode,
    };
  }
  if (order.payment === "cod" && order.inventoryState === "reserved" && order.paymentState === "pending") {
    return finalizeCod(order);
  }
  throw new CheckoutError("conflict", "This checkout attempt has ended. Return to your bag and try again.");
}

async function fetchProviderPayment(paymentId: string): Promise<ProviderPayment | "unknown"> {
  try {
    const payment = await razorpay().payments.fetch(paymentId);
    return {
      id: String(payment.id),
      order_id: String(payment.order_id),
      amount: Number(payment.amount),
      currency: String(payment.currency),
      status: String(payment.status),
      method: payment.method ? String(payment.method) : undefined,
    };
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode || 0;
    paymentLog("provider_payment_fetch_failed", { status });
    if (status >= 400 && status < 500 && status !== 429) return "unknown";
    return "unknown";
  }
}

function methodOf(providerMethod: string | undefined, fallback: Order["payment"]): Order["payment"] {
  if (providerMethod === "card") return "card";
  if (providerMethod === "upi") return "upi";
  return fallback;
}

export async function confirmPayment(input: {
  userId?: string;
  orderId?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature?: string;
  source: "browser" | "webhook" | "reconcile";
}) {
  const config = paymentConfig();
  if (input.source === "browser") {
    if (!input.signature || !checkoutSignatureValid(config.keySecret, input.razorpayOrderId, input.razorpayPaymentId, input.signature)) {
      paymentLog("signature_rejected", { source: input.source });
      throw new CheckoutError("forbidden", "Payment verification failed.");
    }
  }
  const { db } = await getMongo();
  if (input.userId) await bumpRate(db, input.userId, "verify", VERIFY_LIMIT);
  const orders = db.collection<StoredOrder>("orders");
  const order = input.orderId
    ? await orders.findOne({ id: input.orderId, ...(input.userId ? { userId: input.userId } : {}) })
    : await orders.findOne({ razorpayOrderId: input.razorpayOrderId });
  if (!order || order.razorpayOrderId !== input.razorpayOrderId) {
    throw new CheckoutError("conflict", "This payment does not match the checkout.");
  }
  if ((order.paymentState === "captured" || order.paymentState === "refund_pending") && order.razorpayPaymentId === input.razorpayPaymentId) {
    return { verified: true as const, order: publicOrder(order), duplicate: true as const };
  }
  if (order.paymentState === "captured" && order.razorpayPaymentId && order.razorpayPaymentId !== input.razorpayPaymentId) {
    await recordExtraPayment(db, order, input.razorpayPaymentId, "second_payment");
    return { verified: true as const, order: publicOrder(order), duplicate: true as const };
  }

  const payment = await fetchProviderPayment(input.razorpayPaymentId);
  if (payment === "unknown") throw new CheckoutError("unknown", "The bank result is not confirmed yet. Check your account before paying again.");
  if (payment.order_id !== order.razorpayOrderId) throw new CheckoutError("forbidden", "This payment does not match the checkout.");
  if (payment.currency !== "INR" || payment.amount !== order.amountPaise) {
    paymentLog("amount_mismatch", { orderId: order.id, expected: order.amountPaise, received: payment.amount });
    throw new CheckoutError("forbidden", "The payment amount does not match the order.");
  }

  if (payment.status === "failed") {
    if (paymentTransition(order.paymentState, "failed")) {
      await orders.updateOne(
        { id: order.id, paymentState: order.paymentState },
        { $set: { paymentState: "failed", updatedAt: new Date().toISOString() }, $push: { audit: { at: new Date().toISOString(), event: `payment_failed:${input.source}` } } },
      );
      await releaseReservation(db, order.id, "payment_failed");
    }
    throw new CheckoutError("invalid", "Payment failed. You can try again from your bag.");
  }
  if (payment.status === "authorized") {
    await orders.updateOne(
      { id: order.id, paymentState: "pending" },
      { $set: { paymentState: "authorized", razorpayPaymentId: payment.id, updatedAt: new Date().toISOString() }, $push: { audit: { at: new Date().toISOString(), event: "payment_authorized" } } },
    );
    throw new CheckoutError("unknown", "The payment is authorized but not captured yet. It will update in your account. Do not pay again.");
  }
  if (payment.status !== "captured") {
    throw new CheckoutError("unknown", "The payment is not captured yet. Check your account before paying again.");
  }

  if (order.inventoryState === "released" || order.orderState === "cancelled") {
    return settleLateCapture(db, order, payment, input.source);
  }

  const now = new Date().toISOString();
  const claimed = await orders.updateOne(
    {
      id: order.id,
      inventoryState: "reserved",
      paymentState: { $in: ["pending", "authorized", "failed"] },
      $or: [{ razorpayPaymentId: { $exists: false } }, { razorpayPaymentId: payment.id }],
    },
    {
      $set: {
        paymentState: "captured",
        orderState: "confirmed",
        inventoryState: "committed",
        fulfillmentState: "unfulfilled",
        status: "confirmed",
        paymentId: payment.id,
        razorpayPaymentId: payment.id,
        providerMethod: payment.method || "",
        payment: methodOf(payment.method, order.payment),
        updatedAt: now,
      },
      $push: { audit: { at: now, event: `payment_captured:${input.source}` } },
    },
  );
  if (claimed.modifiedCount !== 1) {
    const current = await orders.findOne({ id: order.id });
    if (current?.paymentState === "captured" && current.razorpayPaymentId === payment.id) {
      return { verified: true as const, order: publicOrder(current), duplicate: true as const };
    }
    if (current) await recordExtraPayment(db, current, payment.id, "concurrent_finalize");
    throw new CheckoutError("conflict", "This payment was already recorded.");
  }
  await db.collection("payments").updateOne(
    { razorpayPaymentId: payment.id },
    {
      $setOnInsert: {
        id: `pay_${randomBytes(12).toString("hex")}`,
        orderId: order.id,
        provider: "razorpay",
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: payment.id,
        amountPaise: payment.amount,
        currency: "INR",
        status: "captured",
        createdAt: now,
      },
    },
    { upsert: true },
  );
  await db.collection("users").updateOne({ id: order.userId }, { $set: { savedCart: [], savedCoupon: null } });
  try {
    await enqueueShipment(order.id);
  } catch (error) {
    paymentLog("shipment_enqueue_failed", { orderId: order.id, code: error instanceof Error ? error.name : "error" });
  }
  paymentLog("payment_captured", { orderId: order.id, razorpayPaymentId: payment.id, source: input.source });
  const saved = await orders.findOne({ id: order.id });
  if (saved) queueOrderConfirmation(saved);
  const products = (await db.collection("products").find().toArray()) as unknown as Product[];
  return { verified: true as const, order: saved ? publicOrder(saved) : publicOrder(order), products, duplicate: false as const };
}

async function settleLateCapture(db: Db, order: StoredOrder, payment: ProviderPayment, source: string) {
  const orders = db.collection<StoredOrder>("orders");
  let reclaimed = false;
  try {
    await reserveLines(db, order.items);
    reclaimed = true;
  } catch {
    reclaimed = false;
  }
  const now = new Date().toISOString();
  if (!reclaimed) {
    await orders.updateOne(
      { id: order.id, paymentState: { $ne: "captured" } },
      {
        $set: { paymentState: "refund_pending", paymentId: payment.id, razorpayPaymentId: payment.id, updatedAt: now },
        $push: {
          audit: { at: now, event: `late_capture_unfulfillable:${source}` },
          refunds: { id: `rfd_${randomBytes(8).toString("hex")}`, amountPaise: order.amountPaise, status: "refund_pending" as const, reason: "inventory_unavailable_after_capture", createdAt: now },
        },
      },
    );
    paymentLog("late_capture_unfulfillable", { orderId: order.id, razorpayPaymentId: payment.id });
    throw new CheckoutError("conflict", "Payment was captured after the hold expired and the items are gone. A refund is marked pending and was not sent automatically.");
  }
  const reclaimedOrder = await orders.updateOne(
    { id: order.id, inventoryState: "released" },
    {
      $set: {
        inventoryState: "committed",
        paymentState: "captured",
        orderState: "confirmed",
        status: "confirmed",
        paymentId: payment.id,
        razorpayPaymentId: payment.id,
        updatedAt: now,
      },
      $push: { audit: { at: now, event: `late_capture_reclaimed:${source}` } },
    },
  );
  paymentLog("late_capture_reclaimed", { orderId: order.id, razorpayPaymentId: payment.id });
  const saved = await orders.findOne({ id: order.id });
  if (reclaimedOrder.modifiedCount === 1 && saved) queueOrderConfirmation(saved);
  return { verified: true as const, order: saved ? publicOrder(saved) : publicOrder(order), duplicate: false as const };
}

async function recordExtraPayment(db: Db, order: StoredOrder, razorpayPaymentId: string, reason: string) {
  const now = new Date().toISOString();
  await db.collection("payments").updateOne(
    { razorpayPaymentId },
    {
      $setOnInsert: {
        id: `pay_${randomBytes(12).toString("hex")}`,
        orderId: order.id,
        provider: "razorpay",
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId,
        amountPaise: order.amountPaise,
        currency: "INR",
        status: "refund_pending",
        reason,
        createdAt: now,
      },
    },
    { upsert: true },
  );
  paymentLog("duplicate_payment", { orderId: order.id, razorpayPaymentId, reason });
}

const fulfillmentFromStatus: Partial<Record<OrderStatus, FulfillmentState>> = {
  packed: "packed",
  shipped: "shipped",
  delivered: "delivered",
};

export async function applyAdminStatus(db: Db, orderId: string, status: OrderStatus) {
  const orders = db.collection<StoredOrder>("orders");
  const order = await orders.findOne({ id: orderId });
  if (!order) throw new CheckoutError("invalid", "Order not found.");
  if (order.shipment?.awb) throw new CheckoutError("conflict", "This order has a waybill. Delhivery updates its delivery status.");
  if (!order.paymentState) {
    if (!["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"].includes(status)) {
      throw new CheckoutError("invalid", "That status is not available.");
    }
    await orders.updateOne({ id: orderId }, { $set: { status } });
    const saved = await orders.findOne({ id: orderId });
    return saved ? publicOrder(saved) : publicOrder(order);
  }
  if (status === "cancelled") {
    if (order.paymentState === "captured" || order.paymentState === "refund_pending") {
      const now = new Date().toISOString();
      await orders.updateOne(
        { id: orderId, paymentState: "captured" },
        {
          $set: { paymentState: "refund_pending", updatedAt: now },
          $push: {
            audit: { at: now, event: "admin_cancel_captured" },
            refunds: { id: `rfd_${randomBytes(8).toString("hex")}`, amountPaise: order.amountPaise, status: "refund_pending" as const, reason: "admin_cancel", createdAt: now },
          },
        },
      );
      throw new CheckoutError("conflict", "This payment is captured. A refund is marked pending and was not sent to Razorpay. The shipment was not cancelled.");
    }
    await releaseReservation(db, orderId, "admin_cancel");
    await orders.updateOne(
      { id: orderId, paymentState: { $in: ["pending", "authorized", "failed", "cancelled"] } },
      { $set: { paymentState: "cancelled", orderState: "cancelled", status: "cancelled", updatedAt: new Date().toISOString() } },
    );
    const saved = await orders.findOne({ id: orderId });
    return saved ? publicOrder(saved) : publicOrder(order);
  }
  const nextFulfillment = fulfillmentFromStatus[status];
  if (!nextFulfillment) throw new CheckoutError("invalid", "Choose a fulfilment status.");
  if (order.paymentState !== "captured") throw new CheckoutError("conflict", "Fulfilment starts after the payment is captured.");
  const from = order.fulfillmentState || "unfulfilled";
  if (!fulfillmentTransition(from, nextFulfillment)) throw new CheckoutError("conflict", "That fulfilment step is out of order.");
  const orderState = nextFulfillment === "delivered" ? "completed" : "processing";
  await orders.updateOne(
    { id: orderId, paymentState: "captured", fulfillmentState: from },
    {
      $set: { fulfillmentState: nextFulfillment, status, orderState, updatedAt: new Date().toISOString() },
      $push: { audit: { at: new Date().toISOString(), event: `fulfillment:${nextFulfillment}` } },
    },
  );
  const saved = await orders.findOne({ id: orderId });
  return saved ? publicOrder(saved) : publicOrder(order);
}

export async function requestRefund(orderId: string, amountPaise?: number) {
  if (process.env.NODE_ENV !== "production") {
    throw new CheckoutError("config", "Refunds are not sent to Razorpay outside production.");
  }
  const { db } = await getMongo();
  const orders = db.collection<StoredOrder>("orders");
  const order = await orders.findOne({ id: orderId });
  if (!order?.razorpayPaymentId) throw new CheckoutError("conflict", "This order has no captured online payment.");
  if (order.payment === "cod") throw new CheckoutError("conflict", "Cash on delivery was not captured online, so there is no Razorpay refund.");
  if (order.paymentState !== "captured" && order.paymentState !== "partially_refunded") {
    throw new CheckoutError("conflict", "This payment is not eligible for a refund.");
  }
  const amount = amountPaise && amountPaise > 0 ? amountPaise : order.amountPaise;
  if (amount > order.amountPaise) throw new CheckoutError("invalid", "The refund is larger than the payment.");
  const now = new Date().toISOString();
  const claimed = await orders.updateOne(
    { id: orderId, paymentState: order.paymentState, refunds: { $not: { $elemMatch: { status: "refund_pending" } } } },
    { $set: { paymentState: "refund_pending", updatedAt: now }, $push: { audit: { at: now, event: "refund_requested" } } },
  );
  if (claimed.modifiedCount !== 1) throw new CheckoutError("conflict", "A refund is already in progress.");
  try {
    const refund = await razorpay().payments.refund(order.razorpayPaymentId, { amount });
    const refundId = String(refund.id || "");
    await orders.updateOne({ id: orderId }, {
      $push: { refunds: { id: refundId || `rfd_${randomBytes(8).toString("hex")}`, amountPaise: amount, status: "refund_pending" as const, reason: "admin_refund", createdAt: now, razorpayRefundId: refundId } },
    });
    paymentLog("refund_requested", { orderId, razorpayRefundId: refundId });
    const saved = await orders.findOne({ id: orderId });
    return saved ? publicOrder(saved) : publicOrder(order);
  } catch (error) {
    paymentLog("refund_request_failed", { orderId, status: (error as { statusCode?: number }).statusCode || 0 });
    throw new CheckoutError("unknown", "Razorpay did not accept the refund. The payment was not marked refunded.");
  }
}

export async function applyProviderRefund(input: { razorpayPaymentId: string; razorpayRefundId: string; status: string; amountPaise: number }) {
  const { db } = await getMongo();
  const orders = db.collection<StoredOrder>("orders");
  const order = await orders.findOne({ razorpayPaymentId: input.razorpayPaymentId });
  if (!order) return;
  if (input.status !== "processed") {
    paymentLog("refund_not_processed", { orderId: order.id, status: input.status });
    return;
  }
  const next: PaymentState = input.amountPaise >= order.amountPaise ? "refunded" : "partially_refunded";
  if (!paymentTransition(order.paymentState, next)) return;
  await orders.updateOne(
    { id: order.id, paymentState: order.paymentState },
    { $set: { paymentState: next, updatedAt: new Date().toISOString() }, $push: { audit: { at: new Date().toISOString(), event: `refund_${next}` } } },
  );
  paymentLog("refund_reconciled", { orderId: order.id, state: next });
}

export async function reconcileOpenOrders() {
  const { db } = await getMongo();
  const orders = db.collection<StoredOrder>("orders");
  const now = new Date().toISOString();
  const abandoned = await orders.find({
    inventoryState: "not_reserved",
    paymentState: "pending",
    createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  }).limit(25).toArray();
  for (const order of abandoned) {
    await orders.updateOne(
      { id: order.id, inventoryState: "not_reserved", paymentState: "pending" },
      { $set: { paymentState: "cancelled", orderState: "cancelled", status: "cancelled", inventoryState: "released" } },
    );
  }
  const expired = await orders.find({
    inventoryState: "reserved",
    paymentState: { $in: ["pending", "authorized", "failed"] },
    reserveExpiresAt: { $lt: now },
  }).limit(25).toArray();
  for (const order of expired) {
    if (order.razorpayOrderId && order.razorpayPaymentId) {
      try {
        await confirmPayment({ razorpayOrderId: order.razorpayOrderId, razorpayPaymentId: order.razorpayPaymentId, source: "reconcile" });
        continue;
      } catch (error) {
        if (error instanceof CheckoutError && error.code === "unknown") continue;
      }
    }
    await releaseReservation(db, order.id, "reservation_expired");
    await orders.updateOne(
      { id: order.id, paymentState: { $in: ["pending", "authorized"] }, inventoryState: "released" },
      { $set: { paymentState: "cancelled", orderState: "cancelled", status: "cancelled" } },
    );
  }
  const stuckEvents = await db.collection("webhookEvents").find({ status: { $in: ["received", "error"] }, attempts: { $lt: 8 } }).limit(25).toArray();
  for (const event of stuckEvents) {
    await processWebhookEvent(String(event.eventId));
  }
  const shipmentPass = await processShipmentTasks();
  paymentLog("reconcile_pass", { expired: expired.length, events: stuckEvents.length, shipments: shipmentPass.tasks });
  return { expired: expired.length, events: stuckEvents.length, ...shipmentPass };
}

export async function acceptWebhook(rawBody: string, eventId: string) {
  const parsed = JSON.parse(rawBody) as {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
      refund?: { entity?: { id?: string; payment_id?: string; amount?: number; status?: string } };
    };
  };
  const event = String(parsed.event || "");
  const payment = parsed.payload?.payment?.entity;
  const refund = parsed.payload?.refund?.entity;
  const { db } = await getMongo();
  const id = eventId || createHash("sha256").update(rawBody).digest("hex");
  try {
    await db.collection("webhookEvents").insertOne({
      eventId: id,
      event,
      razorpayPaymentId: payment?.id || refund?.payment_id || "",
      razorpayOrderId: payment?.order_id || "",
      razorpayRefundId: refund?.id || "",
      refundStatus: refund?.status || "",
      refundAmount: Number(refund?.amount || 0),
      status: "received",
      attempts: 0,
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  await processWebhookEvent(id);
  return { eventId: id, event };
}

async function processWebhookEvent(eventId: string) {
  const { db } = await getMongo();
  const events = db.collection("webhookEvents");
  const row = await events.findOne({ eventId });
  if (!row || row.status === "processed") return;
  const claimed = await events.updateOne(
    { eventId, status: { $in: ["received", "error"] } },
    { $inc: { attempts: 1 }, $set: { status: "processing" } },
  );
  if (claimed.modifiedCount !== 1) return;
  try {
    if (row.event === "payment.captured" || row.event === "payment.failed" || row.event === "order.paid") {
      if (row.razorpayOrderId && row.razorpayPaymentId) {
        await confirmPayment({
          razorpayOrderId: String(row.razorpayOrderId),
          razorpayPaymentId: String(row.razorpayPaymentId),
          source: "webhook",
        });
      }
    }
    if (row.event === "refund.processed" || row.event === "refund.failed") {
      await applyProviderRefund({
        razorpayPaymentId: String(row.razorpayPaymentId || ""),
        razorpayRefundId: String(row.razorpayRefundId || ""),
        status: String(row.refundStatus || ""),
        amountPaise: Number(row.refundAmount || 0),
      });
    }
    await events.updateOne({ eventId }, { $set: { status: "processed", processedAt: new Date().toISOString(), lastError: "" } });
  } catch (error) {
    const message = error instanceof CheckoutError ? error.code : "error";
    const terminal = error instanceof CheckoutError && (error.code === "forbidden" || error.code === "invalid" || error.code === "conflict");
    await events.updateOne(
      { eventId },
      { $set: { status: terminal ? "processed" : "error", lastError: message, processedAt: new Date().toISOString() } },
    );
    if (!terminal) throw error;
  }
}
