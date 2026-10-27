import { createHash, randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import type { Coupon, Product } from "@/lib/types";
import { hasPriorStoreOrder, loadPlatformFeePolicy, resolvePlatformFee } from "@/lib/payments/platformFee";
import { quoteCart, quoteCartDroppingStaleCoupon, QuoteError } from "@/lib/payments/quote";
import { checkServiceability, DelhiveryError, freightCharges, invoiceCharge, laneEstimates } from "./delhivery";
import { applyLaneEstimates, applyQuotedCharge, buildShippingOptions, payablePaise, quotedChargePaise, type Serviceability, type ShippingOption } from "./options";
import { assertDelhiveryConfigured, ShippingPolicyError, type ShippingPolicy } from "./policy";
import { loadPolicy } from "./booking";
import { parcelWeight } from "./weight";

const QUOTE_MS = 20 * 60 * 1000;

export class ShippingQuoteError extends Error {
  constructor(readonly code: "config" | "invalid" | "unavailable" | "expired" | "price_changed" | "temporary", message: string, readonly extra?: Record<string, unknown>) {
    super(message);
    this.name = "ShippingQuoteError";
  }
}

export type StoredShippingQuote = {
  id: string;
  userId: string;
  postal: string;
  fingerprint: string;
  serviceability: Serviceability;
  options: ShippingOption[];
  codEligible: boolean;
  netPaise: number;
  weightGrams?: number;
  packageData?: "product_weights" | "store_default_weight" | "missing";
  subtotalPaise: number;
  discountPaise: number;
  expiresAt: string;
  createdAt: string;
};

function fingerprint(items: unknown, couponCode: string, postal: string) {
  return createHash("sha256").update(JSON.stringify({ items, couponCode, postal })).digest("hex");
}

export async function prepareShippingQuote(db: Db, input: { userId: string; items: unknown; couponCode: string; postal: string }) {
  if (!/^\d{6}$/.test(input.postal)) throw new ShippingQuoteError("invalid", "Enter a 6-digit PIN code.");
  let policy: ShippingPolicy;
  try {
    policy = await loadPolicy(db);
    if (policy.delhiveryEnabled) assertDelhiveryConfigured(policy);
  } catch (error) {
    if (error instanceof ShippingPolicyError) throw new ShippingQuoteError("config", "Delivery options are not available right now.");
    throw error;
  }
  if (policy.mode !== "mock" && !policy.delhiveryEnabled && process.env.DELHIVERY_ENABLED !== "0") {
    throw new ShippingQuoteError("config", "Delivery options are not available right now.");
  }
  const products = (await db.collection("products").find({ active: { $ne: false } }).toArray()) as unknown as Product[];
  const coupons = (await db.collection("coupons").find({ active: true }).toArray()) as unknown as Coupon[];
  let priced;
  let droppedCoupon = null as { code: string; message: string } | null;
  try {
    const result = quoteCartDroppingStaleCoupon(products, coupons, Array.isArray(input.items) ? input.items : [], input.couponCode);
    priced = result.quote;
    droppedCoupon = result.droppedCoupon;
  } catch (error) {
    if (error instanceof QuoteError) throw new ShippingQuoteError("invalid", error.message);
    throw error;
  }
  const effectiveCoupon = priced.couponCode || "";
  const netPaise = priced.subtotalPaise - priced.discountPaise;
  const parcel = parcelWeight(Array.isArray(input.items) ? input.items as { productId?: string; quantity?: number }[] : [], products, policy.defaultWeightGrams);
  let serviceability: Serviceability;
  if (!policy.liveReadsEnabled) {
    serviceability = { status: "not_configured" };
  } else {
    try {
      serviceability = await checkServiceability(policy, input.postal);
    } catch (error) {
      if (error instanceof DelhiveryError && error.kind === "auth") throw new ShippingQuoteError("config", "Delivery could not be checked. Please try again.");
      serviceability = { status: "temporary_failure" };
    }
  }
  if (serviceability.status === "temporary_failure") {
    throw new ShippingQuoteError("temporary", "Delivery availability could not be checked. Nothing was marked as deliverable.");
  }
  if (serviceability.status === "available" && (!policy.liveReadsEnabled || !/^\d{6}$/.test(policy.originPin))) {
    throw new ShippingQuoteError("config", "Delivery options are not available right now.");
  }
  const charges = serviceability.status === "available" ? await freightCharges(policy, input.postal, parcel.grams) : { standard: null, express: null, standardCod: null, expressCod: null, standardRupees: null, expressRupees: null, standardCodRupees: null, expressCodRupees: null };
  if (serviceability.status === "available" && charges.standard == null) {
    throw new ShippingQuoteError("temporary", "The delivery price could not be loaded. Please try again.");
  }
  const lane = serviceability.status === "available" ? await laneEstimates(policy, input.postal) : { standard: null, express: null };
  const pricedOptions = buildShippingOptions(policy, serviceability, netPaise, charges);
  const built = { ...pricedOptions, options: applyLaneEstimates(pricedOptions.options, lane) };
  const now = new Date();
  const quote: StoredShippingQuote = {
    id: `shp_${randomBytes(12).toString("hex")}`,
    userId: input.userId,
    postal: input.postal,
    fingerprint: fingerprint(input.items, effectiveCoupon, input.postal),
    serviceability,
    options: built.options,
    codEligible: built.codEligible,
    netPaise,
    weightGrams: parcel.grams,
    packageData: parcel.packageData,
    subtotalPaise: priced.subtotalPaise,
    discountPaise: priced.discountPaise,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + QUOTE_MS).toISOString(),
  };
  await db.collection<StoredShippingQuote>("shippingQuotes").insertOne(quote);
  const feePolicy = await loadPlatformFeePolicy(db);
  const isFirstOrder = !(await hasPriorStoreOrder(db, input.userId));
  const platformFee = resolvePlatformFee(feePolicy, { netPaise, isFirstOrder });
  return {
    quoteId: quote.id,
    expiresAt: quote.expiresAt,
    serviceability: quote.serviceability.status,
    options: quote.options,
    codEligible: quote.codEligible,
    codFeePaise: 0,
    subtotalPaise: quote.subtotalPaise,
    discountPaise: quote.discountPaise,
    couponCode: effectiveCoupon || null,
    couponRemoved: Boolean(droppedCoupon),
    couponNotice: droppedCoupon?.message || null,
    freeShippingPaise: policy.freeShippingPaise,
    platformFeePaise: platformFee.chargePaise,
    platformFeeListPaise: platformFee.listPaise,
    platformFeeWaiveAbovePaise: feePolicy.waiveAbovePaise,
    platformFeeWaiveFirstOrder: platformFee.reason === "first_order",
    platformFeeFirstOrderEnabled: feePolicy.waiveFirstOrder,
    platformFeeWaiveReason: platformFee.reason,
    currency: "INR" as const,
  };
}

export async function revalidateShipping(db: Db, input: {
  userId: string;
  items: unknown;
  couponCode: string;
  postal: string;
  quoteId: string;
  optionId: "standard" | "express";
  payment: "prepaid" | "cod";
  expectedAmountPaise: number;
}) {
  const quote = await db.collection<StoredShippingQuote>("shippingQuotes").findOne({ id: input.quoteId, userId: input.userId });
  if (!quote) throw new ShippingQuoteError("invalid", "Choose a shipping option again.");
  if (quote.expiresAt < new Date().toISOString()) throw new ShippingQuoteError("expired", "The shipping options expired. Check delivery again.");
  if (quote.fingerprint !== fingerprint(input.items, input.couponCode, input.postal) || quote.postal !== input.postal) {
    throw new ShippingQuoteError("expired", "The bag or PIN changed. Check delivery again.");
  }
  const selected = quote.options.find((option) => option.id === input.optionId && option.available);
  if (!selected) throw new ShippingQuoteError("invalid", "Choose an available shipping option.");
  const policy = await loadPolicy(db);
  let serviceability = quote.serviceability;
  if (policy.liveReadsEnabled) {
    try {
      serviceability = await checkServiceability(policy, input.postal);
    } catch (error) {
      if (error instanceof DelhiveryError && error.kind === "auth") throw new ShippingQuoteError("config", "Delivery could not be checked. Please try again.");
      throw new ShippingQuoteError("temporary", "Delivery availability could not be checked again.");
    }
    if (serviceability.status !== "available" || !serviceability.prepaid) {
      throw new ShippingQuoteError("unavailable", "This PIN is not eligible for delivery.");
    }
  }
  const products = (await db.collection("products").find({ active: { $ne: false } }).toArray()) as unknown as Product[];
  const coupons = (await db.collection("coupons").find({ active: true }).toArray()) as unknown as Coupon[];
  const priced = quoteCart(products, coupons, Array.isArray(input.items) ? input.items : [], input.couponCode);
  const netPaise = priced.subtotalPaise - priced.discountPaise;
  const parcel = parcelWeight(Array.isArray(input.items) ? input.items as { productId?: string; quantity?: number }[] : [], products, policy.defaultWeightGrams);
  if (!policy.liveReadsEnabled || !/^\d{6}$/.test(policy.originPin)) {
    throw new ShippingQuoteError("config", "Delivery options are not available right now.");
  }
  let quoted;
  try {
    quoted = await invoiceCharge(policy, input.postal, input.optionId === "express" ? "E" : "S", input.payment === "cod" ? "COD" : "Pre-paid", parcel.grams);
  } catch (error) {
    if (error instanceof DelhiveryError && error.kind === "auth") throw new ShippingQuoteError("config", "Delivery could not be checked. Please try again.");
    throw new ShippingQuoteError("temporary", "The delivery price could not be loaded. Please try again.");
  }
  const quotedPaise = quoted.status === "available" ? quotedChargePaise(quoted.totalRupees) : null;
  if (quotedPaise == null) throw new ShippingQuoteError("temporary", "The delivery price could not be loaded. Please try again.");
  const fresh = applyQuotedCharge(policy, input.optionId, netPaise, quotedPaise, input.payment);
  const codEligible = policy.codEnabled && (serviceability.status === "available" ? serviceability.cod : false);
  if (input.payment === "cod" && !codEligible) throw new ShippingQuoteError("unavailable", "Cash on delivery is not available for this order.");
  const storedCharge = input.payment === "cod" ? selected.codChargePaise : selected.chargePaise;
  const codFeePaise = 0;
  const feePolicy = await loadPlatformFeePolicy(db);
  const isFirstOrder = !(await hasPriorStoreOrder(db, input.userId));
  const platformFee = resolvePlatformFee(feePolicy, { netPaise, isFirstOrder });
  const platformFeePaise = platformFee.chargePaise;
  if (fresh.chargePaise !== storedCharge) {
    const amountPaise = payablePaise(netPaise, fresh.chargePaise, codFeePaise, platformFeePaise);
    throw new ShippingQuoteError("price_changed", "The shipping price changed. Review the new total before paying.", {
      amountPaise,
      shippingPaise: fresh.chargePaise,
      codFeePaise,
      platformFeePaise,
    });
  }
  const amountPaise = payablePaise(netPaise, fresh.chargePaise, codFeePaise, platformFeePaise);
  if (amountPaise !== input.expectedAmountPaise) {
    throw new ShippingQuoteError("price_changed", "The payable total changed. Review it before paying.", {
      amountPaise,
      shippingPaise: fresh.chargePaise,
      codFeePaise,
      platformFeePaise,
    });
  }
  return {
    policy,
    selected: { ...selected, chargePaise: fresh.chargePaise },
    codFeePaise,
    platformFeePaise,
    platformFeeListPaise: platformFee.listPaise,
    amountPaise,
    netPaise,
    parcel,
  };
}
