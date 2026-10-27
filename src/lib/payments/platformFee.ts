import type { Db } from "mongodb";

export type PlatformFeePolicy = {
  enabled: boolean;
  feePaise: number;
  waiveAbovePaise: number;
  waiveFirstOrder: boolean;
};

export type PlatformFeeOverrides = Partial<PlatformFeePolicy>;

export type PlatformFeeResult = {
  listPaise: number;
  chargePaise: number;
  waived: boolean;
  reason: "disabled" | "first_order" | "order_value" | null;
};

export class PlatformFeePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformFeePolicyError";
  }
}

function whole(value: string | undefined, fallback: number) {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new PlatformFeePolicyError("A platform fee amount is not a whole number of paise.");
  }
  return parsed;
}

export function platformFeeFromEnv(env: Record<string, string | undefined> = process.env): PlatformFeePolicy {
  const enabledFlag = env.PLATFORM_FEE_ENABLED?.trim();
  return {
    enabled: enabledFlag === "0" ? false : true,
    feePaise: whole(env.PLATFORM_FEE_PAISE, 3000),
    waiveAbovePaise: whole(env.PLATFORM_FEE_WAIVE_ABOVE_PAISE, 100000),
    waiveFirstOrder: env.PLATFORM_FEE_WAIVE_FIRST_ORDER === "1",
  };
}

export function applyPlatformFeeOverrides(
  policy: PlatformFeePolicy,
  overrides: PlatformFeeOverrides | null | undefined,
): PlatformFeePolicy {
  if (!overrides) return policy;
  const next = { ...policy };
  if (typeof overrides.enabled === "boolean") next.enabled = overrides.enabled;
  if (typeof overrides.waiveFirstOrder === "boolean") next.waiveFirstOrder = overrides.waiveFirstOrder;
  for (const key of ["feePaise", "waiveAbovePaise"] as const) {
    const value = overrides[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) next[key] = value;
  }
  return next;
}

export function publicPlatformFeePolicy(policy: PlatformFeePolicy) {
  return {
    enabled: policy.enabled,
    feePaise: policy.feePaise,
    waiveAbovePaise: policy.waiveAbovePaise,
    waiveFirstOrder: policy.waiveFirstOrder,
  };
}

export async function loadPlatformFeePolicy(db?: Db): Promise<PlatformFeePolicy> {
  const base = platformFeeFromEnv();
  if (!db) return base;
  const saved = await db.collection("storeSettings").findOne({ id: "platformFee" });
  return applyPlatformFeeOverrides(base, (saved?.overrides || null) as PlatformFeeOverrides | null);
}

/** True when this account already has a real store order (paid or confirmed COD). */
export async function hasPriorStoreOrder(db: Db, userId: string) {
  if (!userId) return false;
  const prior = await db.collection("orders").findOne(
    {
      userId,
      $or: [
        { paymentState: "captured" },
        { payment: "cod", orderState: { $in: ["confirmed", "processing", "completed"] } },
        { status: { $in: ["confirmed", "packed", "shipped", "delivered", "Paid", "placed"] } },
      ],
    },
    { projection: { _id: 1 } },
  );
  return Boolean(prior);
}

export function resolvePlatformFee(
  policy: PlatformFeePolicy,
  input: { netPaise: number; isFirstOrder: boolean },
): PlatformFeeResult {
  const listPaise = policy.enabled && policy.feePaise > 0 ? policy.feePaise : 0;
  if (!listPaise) {
    return { listPaise: 0, chargePaise: 0, waived: true, reason: "disabled" };
  }
  if (policy.waiveFirstOrder && input.isFirstOrder) {
    return { listPaise, chargePaise: 0, waived: true, reason: "first_order" };
  }
  if (policy.waiveAbovePaise > 0 && input.netPaise >= policy.waiveAbovePaise) {
    return { listPaise, chargePaise: 0, waived: true, reason: "order_value" };
  }
  return { listPaise, chargePaise: listPaise, waived: false, reason: null };
}

/** Client-side recompute when coupon / bag net changes after the shipping quote. */
export function platformFeeForNet(
  selection: {
    platformFeeListPaise?: number;
    platformFeeWaiveAbovePaise?: number;
    platformFeeWaiveFirstOrder?: boolean;
  },
  netPaise: number,
) {
  const list = selection.platformFeeListPaise ?? 0;
  if (list <= 0) return 0;
  if (selection.platformFeeWaiveFirstOrder) return 0;
  const above = selection.platformFeeWaiveAbovePaise ?? 0;
  if (above > 0 && netPaise >= above) return 0;
  return list;
}
