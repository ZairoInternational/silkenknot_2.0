export type ShippingPolicy = {
  delhiveryEnabled: boolean;
  token: string;
  environment: "staging" | "production";
  baseUrl: string;
  pickupLocation: string;
  originPin: string;
  sellerGstTin: string;
  hsnCode: string;
  standardPaise: number;
  expressEnabled: boolean;
  expressPaise: number;
  freeShippingPaise: number;
  standardEta: string;
  expressEta: string;
  codEnabled: boolean;
  codFeePaise: number;
  bookingMode: "auto" | "manual";
  defaultWeightGrams: number;
  webhookToken: string;
  mode: "off" | "mock" | "live";
  liveReadsEnabled: boolean;
  liveMutationsEnabled: boolean;
};

export class ShippingPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShippingPolicyError";
  }
}

function whole(value: string | undefined, fallback: number) {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new ShippingPolicyError("A shipping amount is not a whole number of paise.");
  return parsed;
}

export function policyFromEnv(env: Record<string, string | undefined>): ShippingPolicy {
  const token = env.DELHIVERY_API_TOKEN?.trim() || "";
  const enabledFlag = env.DELHIVERY_ENABLED?.trim();
  const delhiveryEnabled = enabledFlag === "0" ? false : enabledFlag === "1" ? true : Boolean(token);
  const environment = env.DELHIVERY_ENVIRONMENT?.trim() === "production" ? "production" : "staging";
  const baseUrl = (env.DELHIVERY_BASE_URL?.trim() || (environment === "production" ? "https://track.delhivery.com" : "https://staging-express.delhivery.com")).replace(/\/$/, "");
  const expressPaise = whole(env.SHIPPING_EXPRESS_PAISE, 0);
  const booking = env.SHIPPING_BOOKING_MODE?.trim() === "manual" ? "manual" : "auto";
  const mockRequested = env.DELHIVERY_MODE?.trim() === "mock";
  const mode: ShippingPolicy["mode"] = mockRequested && env.NODE_ENV !== "production" ? "mock" : delhiveryEnabled ? "live" : "off";
  const originPin = env.DELHIVERY_ORIGIN_PIN?.trim() || "";
  const allowedHost = baseUrl === "https://track.delhivery.com" || baseUrl === "https://staging-express.delhivery.com";
  const liveReadsEnabled = env.DELHIVERY_LIVE_READS_ENABLED === "1" && Boolean(token) && allowedHost;
  const stagingHost = baseUrl === "https://staging-express.delhivery.com";
  const productionHost = baseUrl === "https://track.delhivery.com";
  const liveMutationsEnabled = env.DELHIVERY_LIVE_SHIPMENT_CREATION_ENABLED === "1"
    && mode === "live"
    && delhiveryEnabled
    && Boolean(token)
    && (stagingHost || (productionHost && env.NODE_ENV === "production"));
  return {
    delhiveryEnabled,
    token,
    environment,
    baseUrl,
    pickupLocation: env.DELHIVERY_PICKUP_LOCATION?.trim() || "",
    originPin: /^\d{6}$/.test(originPin) ? originPin : "",
    sellerGstTin: env.DELHIVERY_SELLER_GST_TIN?.trim() || "",
    hsnCode: env.DELHIVERY_HSN_CODE?.trim() || "",
    standardPaise: whole(env.SHIPPING_STANDARD_PAISE, 7900),
    expressEnabled: expressPaise > 0,
    expressPaise,
    freeShippingPaise: whole(env.SHIPPING_FREE_ABOVE_PAISE, 99900),
    standardEta: env.SHIPPING_STANDARD_ETA?.trim() || "",
    expressEta: env.SHIPPING_EXPRESS_ETA?.trim() || "",
    codEnabled: env.SHIPPING_COD_ENABLED === "1",
    codFeePaise: whole(env.SHIPPING_COD_FEE_PAISE, 0),
    bookingMode: delhiveryEnabled ? booking : "manual",
    defaultWeightGrams: whole(env.SHIPPING_DEFAULT_WEIGHT_GRAMS, 500),
    webhookToken: env.DELHIVERY_WEBHOOK_TOKEN?.trim() || "",
    mode,
    liveReadsEnabled,
    liveMutationsEnabled,
  };
}

export type ShippingOverrides = Partial<Pick<ShippingPolicy, "standardPaise" | "expressPaise" | "freeShippingPaise" | "codEnabled" | "codFeePaise" | "bookingMode" | "pickupLocation" | "standardEta" | "expressEta" | "delhiveryEnabled">>;

export function applyOverrides(policy: ShippingPolicy, overrides: ShippingOverrides | null | undefined): ShippingPolicy {
  if (!overrides) return policy;
  const next = { ...policy };
  if (typeof overrides.delhiveryEnabled === "boolean") next.delhiveryEnabled = overrides.delhiveryEnabled;
  for (const key of ["standardPaise", "expressPaise", "freeShippingPaise", "codFeePaise"] as const) {
    const value = overrides[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) next[key] = value;
  }
  if (typeof overrides.codEnabled === "boolean") next.codEnabled = overrides.codEnabled;
  if (overrides.bookingMode === "auto" || overrides.bookingMode === "manual") next.bookingMode = overrides.bookingMode;
  if (typeof overrides.pickupLocation === "string") next.pickupLocation = overrides.pickupLocation.trim().slice(0, 80);
  if (typeof overrides.standardEta === "string") next.standardEta = overrides.standardEta.trim().slice(0, 80);
  if (typeof overrides.expressEta === "string") next.expressEta = overrides.expressEta.trim().slice(0, 80);
  next.expressEnabled = next.expressPaise > 0;
  if (next.mode === "mock") {
    next.delhiveryEnabled = false;
    next.bookingMode = "auto";
  } else if (!next.delhiveryEnabled) next.bookingMode = "manual";
  return next;
}

export function assertDelhiveryConfigured(policy: ShippingPolicy) {
  if (!policy.delhiveryEnabled) return;
  if (!policy.token || policy.token.includes("replace")) {
    throw new ShippingPolicyError("Delhivery is enabled but DELHIVERY_API_TOKEN is missing.");
  }
}

export function publicPolicy(policy: ShippingPolicy) {
  return {
    delhiveryEnabled: policy.delhiveryEnabled,
    environment: policy.environment,
    pickupLocation: policy.pickupLocation,
    originPin: policy.originPin,
    standardPaise: policy.standardPaise,
    expressEnabled: policy.expressEnabled,
    expressPaise: policy.expressPaise,
    freeShippingPaise: policy.freeShippingPaise,
    standardEta: policy.standardEta,
    expressEta: policy.expressEta,
    codEnabled: policy.codEnabled,
    codFeePaise: policy.codFeePaise,
    bookingMode: policy.bookingMode,
    defaultWeightGrams: policy.defaultWeightGrams,
    credentialsSet: Boolean(policy.token),
    webhookConfigured: Boolean(policy.webhookToken),
    gstConfigured: Boolean(policy.sellerGstTin && policy.hsnCode),
    mode: policy.mode,
    liveReadsEnabled: policy.liveReadsEnabled,
    liveMutationsEnabled: policy.liveMutationsEnabled,
  };
}
