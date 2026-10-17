import type { ShipmentState, TrackingEvent } from "@/lib/types";
import type { ShippingPolicy } from "./policy";
import { ShippingPolicyError } from "./policy";
import { formatTransit } from "./estimate";
import { quotedChargePaise, type CourierCharges, type Serviceability } from "./options";
import { normalizeDelhiveryStatus } from "./states";

const TIMEOUT_MS = 12_000;
const LABEL_TIMEOUT_MS = 20_000;

export class DelhiveryError extends Error {
  constructor(readonly kind: "auth" | "timeout" | "rejected" | "unavailable" | "config", message: string) {
    super(message);
    this.name = "DelhiveryError";
  }
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

function authHeaders(policy: ShippingPolicy, json = false): Record<string, string> {
  if (!policy.token) throw new ShippingPolicyError("Delhivery is enabled but DELHIVERY_API_TOKEN is missing.");
  const headers: Record<string, string> = { Authorization: `Token ${policy.token}`, Accept: "application/json" };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function call(policy: ShippingPolicy, path: string, init: RequestInit, fetchImpl: FetchLike, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${policy.baseUrl}${path}`, { ...init, signal: controller.signal });
    const text = await response.text();
    return { response, text };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new DelhiveryError("timeout", "Delhivery did not respond in time.");
    throw new DelhiveryError("unavailable", "Delhivery could not be reached.");
  } finally {
    clearTimeout(timer);
  }
}

function flag(value: unknown) {
  return String(value || "").toUpperCase() === "Y";
}

export function parseServiceability(pin: string, status: number, body: string): Serviceability {
  if (!/^\d{6}$/.test(pin)) return { status: "invalid_pin" };
  if (status === 401 || status === 403) throw new DelhiveryError("auth", "Delhivery rejected the API token.");
  if (status === 429 || status >= 500 || status === 0) return { status: "temporary_failure" };
  if (status >= 400) return { status: "temporary_failure" };
  let parsed: { delivery_codes?: { postal_code?: Record<string, unknown> }[] };
  try {
    parsed = JSON.parse(body) as { delivery_codes?: { postal_code?: Record<string, unknown> }[] };
  } catch {
    return { status: "temporary_failure" };
  }
  const row = parsed.delivery_codes?.[0]?.postal_code;
  if (!row) return { status: "unavailable" };
  const remarks = String(row.remarks || "").toUpperCase();
  if (remarks.includes("NSZ")) return { status: "unavailable" };
  const prepaid = flag(row.pre_paid);
  const cod = flag(row.cod) || flag(row.cash);
  if (!prepaid && !cod) return { status: "unavailable" };
  const pickup = row.pickup === undefined || row.pickup === null || String(row.pickup) === "" ? undefined : flag(row.pickup);
  return pickup === undefined ? { status: "available", prepaid, cod } : { status: "available", prepaid, cod, pickup };
}

export type TransitTime =
  | { status: "available"; tatDays: number; expectedDeliveryDate: string | null }
  | { status: "unavailable"; message: string }
  | { status: "not_configured" }
  | { status: "temporary_failure" };

export function parseExpectedTat(status: number, body: string): TransitTime {
  if (status === 401 || status === 403) throw new DelhiveryError("auth", "Delhivery rejected the API token.");
  if (status === 429 || status >= 500 || status === 0) return { status: "temporary_failure" };
  let parsed: { success?: boolean; msg?: string; detail?: string; data?: { tat?: number; expected_delivery_date?: string | null } };
  try {
    parsed = JSON.parse(body) as typeof parsed;
  } catch {
    return { status: "temporary_failure" };
  }
  if (status >= 400 || parsed.success === false) {
    return { status: "unavailable", message: String(parsed.msg || parsed.detail || "Transit time is not available for this PIN.").slice(0, 180) };
  }
  const tatDays = parsed.data?.tat;
  if (!Number.isInteger(tatDays) || (tatDays as number) < 0 || (tatDays as number) > 60) return { status: "temporary_failure" };
  const date = parsed.data?.expected_delivery_date;
  const expectedDeliveryDate = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  return { status: "available", tatDays: tatDays as number, expectedDeliveryDate };
}

export async function expectedTat(policy: ShippingPolicy, destinationPin: string, mot: "S" | "E", fetchImpl: FetchLike = fetch): Promise<TransitTime> {
  if (!/^\d{6}$/.test(destinationPin)) return { status: "unavailable", message: "Enter a 6-digit PIN." };
  if (!policy.liveReadsEnabled || !/^\d{6}$/.test(policy.originPin)) return { status: "not_configured" };
  assertOfficialHost(policy);
  const params = new URLSearchParams({ origin_pin: policy.originPin, destination_pin: destinationPin, mot, pdt: "B2C" });
  const { response, text } = await call(policy, `/api/dc/expected_tat?${params}`, { headers: authHeaders(policy) }, fetchImpl);
  return parseExpectedTat(response.status, text);
}

export async function laneEstimates(policy: ShippingPolicy, destinationPin: string, fetchImpl: FetchLike = fetch) {
  async function one(mot: "S" | "E") {
    try {
      const result = await expectedTat(policy, destinationPin, mot, fetchImpl);
      return result.status === "available" ? formatTransit(result.tatDays, result.expectedDeliveryDate) : null;
    } catch {
      return null;
    }
  }
  const [standard, express] = await Promise.all([one("S"), one("E")]);
  return { standard, express };
}

export type FreightQuote =
  | { status: "available"; totalRupees: number }
  | { status: "unavailable" }
  | { status: "not_configured" }
  | { status: "temporary_failure" };

export function parseInvoiceCharge(status: number, body: string): FreightQuote {
  if (status === 401 || status === 403) throw new DelhiveryError("auth", "Delhivery rejected the API token.");
  if (status === 429 || status >= 500 || status === 0) return { status: "temporary_failure" };
  let parsed: { total_amount?: number; error?: string } | { total_amount?: number; error?: string }[];
  try {
    parsed = JSON.parse(body) as typeof parsed;
  } catch {
    return { status: "temporary_failure" };
  }
  if (status >= 400) return { status: "temporary_failure" };
  const row = Array.isArray(parsed) ? parsed[0] : parsed;
  const total = row?.total_amount;
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0) return { status: "unavailable" };
  return { status: "available", totalRupees: total };
}

export async function invoiceCharge(policy: ShippingPolicy, destinationPin: string, mot: "S" | "E", payment: "Pre-paid" | "COD", weightGrams = policy.defaultWeightGrams, fetchImpl: FetchLike = fetch): Promise<FreightQuote> {
  if (!/^\d{6}$/.test(destinationPin) || !/^\d{6}$/.test(policy.originPin) || !policy.liveReadsEnabled) return { status: "not_configured" };
  assertOfficialHost(policy);
  const grams = Number.isInteger(weightGrams) && weightGrams > 0 ? weightGrams : policy.defaultWeightGrams;
  const params = new URLSearchParams({
    md: mot,
    cgm: String(grams),
    o_pin: policy.originPin,
    d_pin: destinationPin,
    ss: "Delivered",
    pt: payment,
  });
  const { response, text } = await call(policy, `/api/kinko/v1/invoice/charges/.json?${params}`, { headers: authHeaders(policy) }, fetchImpl);
  return parseInvoiceCharge(response.status, text);
}

export async function freightCharges(policy: ShippingPolicy, destinationPin: string, weightGrams = policy.defaultWeightGrams, fetchImpl: FetchLike = fetch): Promise<CourierCharges> {
  async function one(mot: "S" | "E", payment: "Pre-paid" | "COD") {
    try {
      const result = await invoiceCharge(policy, destinationPin, mot, payment, weightGrams, fetchImpl);
      if (result.status !== "available") return null;
      const paise = quotedChargePaise(result.totalRupees);
      return paise == null ? null : { paise, rupees: result.totalRupees };
    } catch {
      return null;
    }
  }
  const [standard, express, standardCod, expressCod] = await Promise.all([
    one("S", "Pre-paid"),
    one("E", "Pre-paid"),
    policy.codEnabled ? one("S", "COD") : Promise.resolve(null),
    policy.codEnabled ? one("E", "COD") : Promise.resolve(null),
  ]);
  return {
    standard: standard?.paise ?? null,
    express: express?.paise ?? null,
    standardCod: standardCod?.paise ?? null,
    expressCod: expressCod?.paise ?? null,
    standardRupees: standard?.rupees ?? null,
    expressRupees: express?.rupees ?? null,
    standardCodRupees: standardCod?.rupees ?? null,
    expressCodRupees: expressCod?.rupees ?? null,
  };
}

export async function checkServiceability(policy: ShippingPolicy, pin: string, fetchImpl: FetchLike = fetch): Promise<Serviceability> {
  if (!/^\d{6}$/.test(pin)) return { status: "invalid_pin" };
  if (!policy.liveReadsEnabled) return { status: "not_configured" };
  assertOfficialHost(policy);
  const { response, text } = await call(policy, `/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pin)}`, { headers: authHeaders(policy) }, fetchImpl);
  return parseServiceability(pin, response.status, text);
}

export type ManifestInput = {
  orderNumber: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  phone: string;
  paymentMode: "Pre-paid" | "COD" | "Pickup";
  amountRupees: number;
  codAmountRupees: number;
  weightGrams: number;
  shippingMode: "Surface" | "Express";
  products: string;
};

export type ManifestResult = { waybill: string; reference: string } | { uncertain: true } | { rejected: string };

export function parseManifest(status: number, body: string): ManifestResult {
  if (status === 401 || status === 403) throw new DelhiveryError("auth", "Delhivery rejected the API token.");
  if (status === 0 || status === 429 || status >= 500) return { uncertain: true };
  let parsed: { packages?: { status?: string; waybill?: string; refnum?: string; remarks?: unknown; client?: string }[]; success?: boolean; rmk?: string };
  try {
    parsed = JSON.parse(body) as typeof parsed;
  } catch {
    return status >= 200 && status < 300 ? { uncertain: true } : { rejected: "Delhivery returned an unreadable response." };
  }
  const pack = parsed.packages?.[0];
  const waybill = String(pack?.waybill || "");
  const ok = String(pack?.status || "").toLowerCase() === "success" || (parsed.success === true && Boolean(waybill));
  if (ok && waybill) return { waybill, reference: String(pack?.refnum || "") };
  const remarks = Array.isArray(pack?.remarks) ? pack.remarks.map(String).join(" ") : String(pack?.remarks || parsed.rmk || "");
  const embedded = remarks.match(/\b\d{11,20}\b/);
  if (embedded && /duplicate|already/i.test(remarks)) return { waybill: embedded[0], reference: "" };
  if (status >= 400 || pack?.status) return { rejected: remarks.slice(0, 180) || "Delhivery rejected the shipment." };
  return { uncertain: true };
}

function assertOfficialHost(policy: ShippingPolicy) {
  let host = "";
  try {
    host = new URL(policy.baseUrl).host;
  } catch {
    throw new DelhiveryError("config", "Delhivery host is not an official API host.");
  }
  if (host !== "track.delhivery.com" && host !== "staging-express.delhivery.com") {
    throw new DelhiveryError("config", "Delhivery host is not an official API host.");
  }
}

function assertLiveMutation(policy: ShippingPolicy) {
  assertOfficialHost(policy);
  if (!policy.liveMutationsEnabled) throw new DelhiveryError("config", "Live Delhivery shipment changes are disabled.");
}

export async function createManifest(policy: ShippingPolicy, input: ManifestInput, fetchImpl: FetchLike = fetch): Promise<ManifestResult> {
  assertLiveMutation(policy);
  if (!policy.pickupLocation) throw new DelhiveryError("config", "Set DELHIVERY_PICKUP_LOCATION to the warehouse name registered with Delhivery.");
  if (!policy.sellerGstTin || !policy.hsnCode) throw new DelhiveryError("config", "Delhivery requires DELHIVERY_SELLER_GST_TIN and DELHIVERY_HSN_CODE before a shipment can be booked.");
  const payload = {
    pickup_location: { name: policy.pickupLocation },
    shipments: [{
      name: input.name,
      add: input.address,
      pin: input.pin,
      city: input.city,
      state: input.state,
      country: "India",
      phone: input.phone,
      order: input.orderNumber,
      payment_mode: input.paymentMode,
      products_desc: input.products.slice(0, 180),
      cod_amount: input.paymentMode === "COD" ? input.codAmountRupees : 0,
      total_amount: input.amountRupees,
      quantity: 1,
      weight: input.weightGrams,
      shipping_mode: input.shippingMode,
      seller_gst_tin: policy.sellerGstTin,
      hsn_code: policy.hsnCode,
    }],
  };
  const body = new URLSearchParams({ format: "json", data: JSON.stringify(payload) });
  const { response, text } = await call(policy, "/api/cmu/create.json", {
    method: "POST",
    headers: { ...authHeaders(policy), "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }, fetchImpl);
  return parseManifest(response.status, text);
}

export function parseTracking(status: number, body: string): { found: boolean; events: TrackingEvent[] } {
  if (status === 401 || status === 403) throw new DelhiveryError("auth", "Delhivery rejected the API token.");
  if (status === 429 || status >= 500) throw new DelhiveryError("unavailable", "Tracking is temporarily unavailable.");
  let parsed: { ShipmentData?: { Shipment?: Record<string, unknown> }[] };
  try {
    parsed = JSON.parse(body) as typeof parsed;
  } catch {
    throw new DelhiveryError("unavailable", "Tracking returned an unreadable response.");
  }
  const shipment = parsed.ShipmentData?.[0]?.Shipment;
  if (!shipment) return { found: false, events: [] };
  const scans = Array.isArray(shipment.Scans) ? shipment.Scans : [];
  const events: TrackingEvent[] = [];
  for (const scan of scans) {
    const detail = (scan as { ScanDetail?: Record<string, unknown> }).ScanDetail || (scan as Record<string, unknown>);
    const providerStatus = String(detail.Scan || detail.StatusCode || "");
    const mapped = normalizeDelhiveryStatus(providerStatus);
    const at = String(detail.ScanDateTime || detail.StatusDateTime || "");
    if (!providerStatus || !at) continue;
    events.push({
      at,
      state: mapped || "unknown",
      providerStatus,
      location: String(detail.ScannedLocation || detail.Instructions || "").slice(0, 120) || undefined,
    });
  }
  const current = (shipment.Status as { Status?: string; StatusDateTime?: string; Instructions?: string } | undefined);
  if (current?.Status && current.StatusDateTime && !events.some((event) => event.at === current.StatusDateTime && event.providerStatus === current.Status)) {
    events.push({
      at: current.StatusDateTime,
      state: normalizeDelhiveryStatus(current.Status) || "unknown",
      providerStatus: current.Status,
      instructions: current.Instructions?.slice(0, 160),
    });
  }
  events.sort((a, b) => a.at.localeCompare(b.at));
  return { found: true, events };
}

export type LabelSize = "A4" | "4R";

export type ShippingLabel = {
  kind: "pdf" | "link" | "data";
  waybill: string;
  pdfSize: LabelSize;
  requestedPdf: boolean;
  downloadUrl: string;
  expiresInSeconds: number | null;
  pdfBase64: string;
  packagesFound: number;
  fields: { key: string; value: string }[];
};

function labelFields(pack: Record<string, unknown>) {
  const rows: { key: string; value: string }[] = [];
  for (const [key, value] of Object.entries(pack)) {
    if (key === "pdf_download_link" || key === "pdf_encoding" || key === "error" || key === "pdf_link_expiry") continue;
    if (value === null || value === undefined || value === "") continue;
    const text = typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : "";
    if (!text) continue;
    rows.push({ key, value: text.length > 500 ? `${text.slice(0, 500)}…` : text });
  }
  return rows.slice(0, 40);
}

export function parsePackingSlip(status: number, contentType: string, body: string, pdfSize: LabelSize, requestedPdf: boolean): ShippingLabel {
  if (status === 401 || status === 403) throw new DelhiveryError("auth", "Delhivery rejected the API token.");
  if (status === 429 || status >= 500) throw new DelhiveryError("unavailable", "The shipping label is temporarily unavailable.");
  const pdfBytes = contentType.toLowerCase().includes("pdf") || body.startsWith("%PDF");
  if (pdfBytes && status >= 200 && status < 300) {
    return {
      kind: "pdf",
      waybill: "",
      pdfSize,
      requestedPdf,
      downloadUrl: "",
      expiresInSeconds: null,
      pdfBase64: Buffer.from(body, "binary").toString("base64"),
      packagesFound: 1,
      fields: [],
    };
  }
  if (status >= 400) throw new DelhiveryError("rejected", "Delhivery rejected the shipping label request.");
  let parsed: { packages?: Record<string, unknown>[]; packages_found?: number; pdf_link_expiry?: number };
  try {
    parsed = JSON.parse(body) as typeof parsed;
  } catch {
    throw new DelhiveryError("unavailable", "The shipping label response could not be read.");
  }
  const packages = Array.isArray(parsed.packages) ? parsed.packages : [];
  const found = typeof parsed.packages_found === "number" ? parsed.packages_found : packages.length;
  if (!packages.length || found < 1) throw new DelhiveryError("rejected", "Delhivery did not return a label for this waybill.");
  const pack = packages.find((item) => !item.error) || packages[0];
  if (pack.error) throw new DelhiveryError("rejected", String(pack.error).slice(0, 180) || "Delhivery did not return a label for this waybill.");
  const downloadUrl = typeof pack.pdf_download_link === "string" && pack.pdf_download_link.startsWith("https://") ? pack.pdf_download_link : "";
  const expiry = typeof pack.pdf_link_expiry === "number" ? pack.pdf_link_expiry : typeof parsed.pdf_link_expiry === "number" ? parsed.pdf_link_expiry : null;
  const waybill = String(pack.wbn || "");
  if (downloadUrl) {
    return {
      kind: "link",
      waybill,
      pdfSize,
      requestedPdf,
      downloadUrl,
      expiresInSeconds: expiry ?? 86400,
      pdfBase64: "",
      packagesFound: found,
      fields: labelFields(pack),
    };
  }
  const fields = labelFields(pack);
  if (!fields.length) throw new DelhiveryError("rejected", "Delhivery did not return a label for this waybill.");
  return {
    kind: "data",
    waybill,
    pdfSize,
    requestedPdf,
    downloadUrl: "",
    expiresInSeconds: null,
    pdfBase64: "",
    packagesFound: found,
    fields,
  };
}

export async function fetchPackingSlip(policy: ShippingPolicy, waybill: string, pdfSize: LabelSize, pdf: boolean, fetchImpl: FetchLike = fetch): Promise<ShippingLabel> {
  if (waybill.startsWith("TEST")) throw new DelhiveryError("rejected", "A test waybill is not sent to Delhivery.");
  if (pdfSize !== "A4" && pdfSize !== "4R") throw new DelhiveryError("rejected", "Choose an A4 or 4R label.");
  if (!policy.liveReadsEnabled) throw new DelhiveryError("config", "Live Delhivery reads are disabled.");
  assertOfficialHost(policy);
  const params = new URLSearchParams({ wbns: waybill, pdf: pdf ? "true" : "false", pdf_size: pdfSize });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LABEL_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${policy.baseUrl}/api/p/packing_slip?${params}`, { headers: authHeaders(policy), signal: controller.signal });
    const contentType = response.headers.get("content-type") || "";
    const bytes = Buffer.from(await response.arrayBuffer());
    const head = bytes.subarray(0, 5).toString("utf8");
    if ((contentType.toLowerCase().includes("pdf") || head.startsWith("%PDF")) && response.status >= 200 && response.status < 300) {
      return {
        kind: "pdf",
        waybill,
        pdfSize,
        requestedPdf: pdf,
        downloadUrl: "",
        expiresInSeconds: null,
        pdfBase64: bytes.toString("base64"),
        packagesFound: 1,
        fields: [],
      };
    }
    const parsed = parsePackingSlip(response.status, contentType, bytes.toString("utf8"), pdfSize, pdf);
    return { ...parsed, waybill: parsed.waybill || waybill };
  } catch (error) {
    if (error instanceof DelhiveryError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new DelhiveryError("timeout", "Delhivery did not respond in time.");
    throw new DelhiveryError("unavailable", "Delhivery could not be reached.");
  } finally {
    clearTimeout(timer);
  }
}

export async function trackWaybill(policy: ShippingPolicy, waybill: string, fetchImpl: FetchLike = fetch) {
  if (waybill.startsWith("TEST")) throw new DelhiveryError("rejected", "A test waybill is not sent to Delhivery.");
  if (!policy.liveReadsEnabled) throw new DelhiveryError("config", "Live Delhivery reads are disabled.");
  assertOfficialHost(policy);
  const { response, text } = await call(policy, `/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}`, { headers: authHeaders(policy) }, fetchImpl);
  return parseTracking(response.status, text);
}

export async function cancelWaybill(policy: ShippingPolicy, waybill: string, fetchImpl: FetchLike = fetch) {
  assertLiveMutation(policy);
  const { response, text } = await call(policy, "/api/p/edit", {
    method: "POST",
    headers: authHeaders(policy, true),
    body: JSON.stringify({ waybill, cancellation: "true" }),
  }, fetchImpl);
  if (response.status === 401 || response.status === 403) throw new DelhiveryError("auth", "Delhivery rejected the API token.");
  if (response.status >= 500 || response.status === 429) throw new DelhiveryError("unavailable", "Delhivery could not cancel the shipment.");
  if (response.status >= 400) throw new DelhiveryError("rejected", "Delhivery rejected the cancellation.");
  if (!/"status"\s*:\s*true|success/i.test(text) && text.trim()) {
    throw new DelhiveryError("rejected", "Delhivery did not confirm the cancellation.");
  }
  return { cancelled: true as const };
}

export async function requestPickup(policy: ShippingPolicy, count: number, fetchImpl: FetchLike = fetch) {
  assertLiveMutation(policy);
  if (!policy.pickupLocation) throw new DelhiveryError("config", "Set the registered pickup location before requesting pickup.");
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const pickupDate = date.toISOString().slice(0, 10);
  const { response } = await call(policy, "/fm/request/new/", {
    method: "POST",
    headers: authHeaders(policy, true),
    body: JSON.stringify({
      pickup_time: "11:00:00",
      pickup_date: pickupDate,
      pickup_location: policy.pickupLocation,
      expected_package_count: count,
    }),
  }, fetchImpl);
  if (response.status === 401 || response.status === 403) throw new DelhiveryError("auth", "Delhivery rejected the API token.");
  if (response.status === 404) throw new DelhiveryError("config", "Pickup requests are not enabled for this Delhivery account.");
  if (response.status >= 400) throw new DelhiveryError("rejected", "Delhivery rejected the pickup request.");
  return { requested: true as const, pickupDate };
}

export function waybillFromPush(body: unknown): { waybill: string; events: TrackingEvent[] } | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  const shipment = (row.Shipment && typeof row.Shipment === "object" ? row.Shipment : row) as Record<string, unknown>;
  const waybill = String(shipment.AWB || shipment.Waybill || shipment.waybill || "");
  if (!/^\d{8,20}$/.test(waybill)) return null;
  const status = shipment.Status && typeof shipment.Status === "object" ? shipment.Status as Record<string, unknown> : null;
  const providerStatus = String(status?.Status || shipment.Scan || "");
  const at = String(status?.StatusDateTime || shipment.ScanDateTime || "");
  if (!providerStatus || !at) return { waybill, events: [] };
  return {
    waybill,
    events: [{
      at,
      state: normalizeDelhiveryStatus(providerStatus) || "unknown",
      providerStatus,
      instructions: typeof status?.Instructions === "string" ? status.Instructions.slice(0, 160) : undefined,
    }],
  };
}

export function mapState(status: string): ShipmentState {
  return normalizeDelhiveryStatus(status) || "unknown";
}
