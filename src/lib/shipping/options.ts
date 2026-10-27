import type { ShippingPolicy } from "./policy";

export type Serviceability =
  | { status: "available"; prepaid: boolean; cod: boolean; pickup?: boolean }
  | { status: "unavailable" }
  | { status: "invalid_pin" }
  | { status: "temporary_failure" }
  | { status: "not_configured" };

export const SHIPPING_BUFFER_RUPEES = 10;

export type ShippingOption = {
  id: "standard" | "express";
  label: string;
  detail: string;
  chargePaise: number;
  codChargePaise: number | null;
  estimateRupees: number | null;
  codEstimateRupees: number | null;
  shippingDiscountPaise: number;
  estimate: string;
  estimateSource: "store_policy" | "delhivery_tat" | "none";
  priceSource: "delhivery_estimate";
  available: boolean;
};

export type CourierCharges = {
  standard: number | null;
  express: number | null;
  standardCod: number | null;
  expressCod: number | null;
  standardRupees?: number | null;
  expressRupees?: number | null;
  standardCodRupees?: number | null;
  expressCodRupees?: number | null;
};

export function quotedChargePaise(totalRupees: number) {
  if (!Number.isFinite(totalRupees) || totalRupees < 0) return null;
  return Math.round(totalRupees + SHIPPING_BUFFER_RUPEES) * 100;
}

export function applyQuotedCharge(policy: ShippingPolicy, method: "standard" | "express", netPaise: number, quotedPaise: number, payment: "prepaid" | "cod" = "prepaid") {
  if (method === "standard" && payment === "prepaid" && netPaise >= policy.freeShippingPaise) {
    return { chargePaise: 0, shippingDiscountPaise: quotedPaise };
  }
  return { chargePaise: quotedPaise, shippingDiscountPaise: 0 };
}

export function buildShippingOptions(policy: ShippingPolicy, serviceability: Serviceability, netPaise: number, charges: CourierCharges) {
  if (serviceability.status !== "available" || !serviceability.prepaid || charges.standard == null) {
    return { options: [] as ShippingOption[], codEligible: false };
  }
  const standard = applyQuotedCharge(policy, "standard", netPaise, charges.standard, "prepaid");
  const options: ShippingOption[] = [{
    id: "standard",
    label: standard.chargePaise === 0 ? "Free shipping" : "Standard delivery",
    detail: standard.chargePaise === 0 ? "Free delivery on this order." : "Delivered to your PIN.",
    chargePaise: standard.chargePaise,
    codChargePaise: charges.standardCod,
    estimateRupees: charges.standardRupees ?? null,
    codEstimateRupees: charges.standardCodRupees ?? null,
    shippingDiscountPaise: standard.shippingDiscountPaise,
    estimate: policy.standardEta,
    estimateSource: policy.standardEta ? "store_policy" : "none",
    priceSource: "delhivery_estimate",
    available: true,
  }];
  if (charges.express != null) {
    options.push({
      id: "express",
      label: "Express delivery",
      detail: "A faster delivery option.",
      chargePaise: charges.express,
      codChargePaise: charges.expressCod,
      estimateRupees: charges.expressRupees ?? null,
      codEstimateRupees: charges.expressCodRupees ?? null,
      shippingDiscountPaise: 0,
      estimate: policy.expressEta,
      estimateSource: policy.expressEta ? "store_policy" : "none",
      priceSource: "delhivery_estimate",
      available: true,
    });
  }
  return { options, codEligible: policy.codEnabled && serviceability.cod && charges.standardCod != null };
}

export function applyLaneEstimates(options: ShippingOption[], lane: { standard: { estimate: string; estimateSource: ShippingOption["estimateSource"] } | null; express: { estimate: string; estimateSource: ShippingOption["estimateSource"] } | null }) {
  return options.map((option) => {
    const next = option.id === "express" ? lane.express : lane.standard;
    if (!next || next.estimateSource !== "delhivery_tat") return option;
    return {
      ...option,
      estimate: next.estimate,
      estimateSource: "delhivery_tat" as const,
    };
  });
}

export function payablePaise(netPaise: number, chargePaise: number, codFeePaise: number, platformFeePaise = 0) {
  return netPaise + chargePaise + codFeePaise + platformFeePaise;
}
