import assert from "node:assert/strict";
import test from "node:test";
import { expectedTat, parseExpectedTat, parseInvoiceCharge, parseManifest, parseServiceability, waybillFromPush } from "./delhivery";
import { parcelWeight } from "./weight";
import { applyLaneEstimates, applyQuotedCharge, buildShippingOptions, payablePaise, quotedChargePaise, type CourierCharges } from "./options";
import { policyFromEnv } from "./policy";
import { deliveryBy, describePin, formatTransit } from "./estimate";
import { nextMockStep } from "./mock";
import { createManifest, DelhiveryError, fetchPackingSlip, parsePackingSlip, requestPickup, trackWaybill } from "./delhivery";
import { applyTracking, canCancelShipment, canRequestReturn, customerCanCancel, customerOrderVisible, normalizeDelhiveryStatus, shipmentTransition, waybillListLabel, waybillProgress } from "./states";
import type { TrackingEvent } from "../types";

const policy = policyFromEnv({
  DELHIVERY_ENABLED: "0",
  SHIPPING_STANDARD_PAISE: "7900",
  SHIPPING_EXPRESS_PAISE: "14900",
  SHIPPING_FREE_ABOVE_PAISE: "99900",
  SHIPPING_COD_FEE_PAISE: "2000",
  SHIPPING_COD_ENABLED: "1",
  SHIPPING_STANDARD_ETA: "3-5 days",
});

test("serviceability does not treat an error or empty PIN list as deliverable", () => {
  assert.equal(parseServiceability("110001", 500, "").status, "temporary_failure");
  assert.equal(parseServiceability("110001", 200, "{\"delivery_codes\":[]}").status, "unavailable");
  assert.equal(parseServiceability("abc", 200, "{}").status, "invalid_pin");
  assert.throws(() => parseServiceability("110001", 401, ""));
  const ok = parseServiceability("110001", 200, JSON.stringify({ delivery_codes: [{ postal_code: { pre_paid: "Y", cod: "N", cash: "N" } }] }));
  assert.deepEqual(ok, { status: "available", prepaid: true, cod: false });
});

const charges: CourierCharges = { standard: 7700, express: 10300, standardCod: 11400, expressCod: 14000 };

test("express is offered when Delhivery returns an express estimate", () => {
  const options = buildShippingOptions(policy, { status: "available", prepaid: true, cod: true }, 50000, charges);
  assert.equal(options.options.some((option) => option.id === "express"), true);
  assert.equal(options.options.find((option) => option.id === "standard")?.chargePaise, 7700);
  const blocked = buildShippingOptions(policy, { status: "available", prepaid: true, cod: false }, 50000, { ...charges, express: null, standardCod: null });
  assert.equal(blocked.options.some((option) => option.id === "express"), false);
  assert.equal(blocked.codEligible, false);
  assert.equal(buildShippingOptions(policy, { status: "unavailable" }, 50000, charges).options.length, 0);
});

test("a Delhivery estimate plus ₹10 rounds to the nearest rupee", () => {
  assert.equal(quotedChargePaise(66.75), 7700);
  assert.equal(quotedChargePaise(93.25), 10300);
  assert.equal(parseInvoiceCharge(200, JSON.stringify([{ total_amount: 66.75 }])).status, "available");
  assert.deepEqual(applyQuotedCharge(policy, "standard", 100000, 7700), { chargePaise: 0, shippingDiscountPaise: 7700 });
  assert.equal(payablePaise(50000, 7700, 0), 57700);
});

test("a parcel weight is the sum of product weights, with the store fallback only for a missing product", () => {
  const products = [{ id: "soap", weightGrams: 100 }, { id: "butter", weightGrams: 200 }];
  assert.deepEqual(parcelWeight([{ productId: "soap", quantity: 2 }, { productId: "butter", quantity: 1 }], products, 500), { grams: 400, packageData: "product_weights" });
  assert.equal(parcelWeight([{ productId: "missing", quantity: 1 }], products, 500).grams, 500);
});

test("a duplicate Delhivery remark can recover a waybill without booking twice", () => {
  const parsed = parseManifest(200, JSON.stringify({ packages: [{ status: "Fail", remarks: ["Duplicate order id 1234567890123"] }] }));
  assert.deepEqual(parsed, { waybill: "1234567890123", reference: "" });
  assert.deepEqual(parseManifest(504, ""), { uncertain: true });
});

test("a waybill keeps the customer status on the courier, not the studio dropdown", () => {
  assert.equal(waybillProgress("pickup_scheduled").badge, "Processing");
  assert.equal(waybillProgress("pickup_scheduled").index, 1);
  assert.equal(waybillListLabel("pickup_scheduled"), "Pickup scheduled");
  assert.equal(waybillProgress("delivered").badge, "Delivered");
  assert.equal(waybillListLabel("in_transit"), "In transit");
});

test("tracking does not downgrade a delivered shipment or accept an older step", () => {
  assert.equal(normalizeDelhiveryStatus("Dispatched"), "out_for_delivery");
  assert.equal(shipmentTransition("delivered", "in_transit", "2026-10-13T10:00:00", "2026-10-13T09:00:00"), false);
  const delivered: TrackingEvent = { at: "2026-10-13T09:00:00", state: "delivered", providerStatus: "Delivered" };
  const late: TrackingEvent = { at: "2026-10-13T08:00:00", state: "in_transit", providerStatus: "In Transit" };
  const applied = applyTracking([delivered], "delivered", late);
  assert.equal(applied.state, "delivered");
});

test("cancellation and returns follow shipment progress", () => {
  assert.equal(canCancelShipment("booked"), true);
  assert.equal(canCancelShipment("picked_up"), false);
  assert.equal(customerCanCancel({ status: "confirmed", shipment: { state: "pickup_scheduled" } }), true);
  assert.equal(customerCanCancel({ status: "shipped", shipment: { state: "in_transit" } }), false);
  assert.equal(customerCanCancel({ fulfillmentState: "shipped", shipment: { state: "booked" } }), false);
  assert.equal(customerCanCancel({ status: "cancelled", shipment: { state: "not_created" } }), false);
  assert.equal(canRequestReturn("delivered", "2026-10-01T00:00:00.000Z", "2026-10-05T00:00:00.000Z", 7), true);
  assert.equal(canRequestReturn("delivered", "2026-10-01T00:00:00.000Z", "2026-10-20T00:00:00.000Z", 7), false);
});

test("customers only see their paid or confirmed COD orders", () => {
  assert.equal(customerOrderVisible({ paymentState: "pending", payment: "upi", orderState: "pending_payment" }), false);
  assert.equal(customerOrderVisible({ paymentState: "pending", payment: "cod", orderState: "confirmed" }), true);
  assert.equal(customerOrderVisible({ paymentState: "captured", payment: "upi" }), true);
  assert.equal(customerOrderVisible({ status: "cancelled", paymentState: "cancelled", payment: "cod", orderState: "cancelled" }), true);
});

test("origin PIN is kept only when it is 6 digits", () => {
  assert.equal(policyFromEnv({ DELHIVERY_ORIGIN_PIN: "201304" }).originPin, "201304");
  assert.equal(policyFromEnv({ DELHIVERY_ORIGIN_PIN: "20130" }).originPin, "");
  assert.equal(policyFromEnv({}).originPin, "");
});

test("expected TAT uses the warehouse PIN and falls back when it is missing", async () => {
  const body = JSON.stringify({ success: true, data: { tat: 5, expected_delivery_date: "2026-10-19" } });
  assert.deepEqual(parseExpectedTat(200, body), { status: "available", tatDays: 5, expectedDeliveryDate: "2026-10-19" });
  assert.equal(parseExpectedTat(400, JSON.stringify({ success: false, msg: "Origin pin not serviceable." })).status, "unavailable");
  assert.throws(() => parseExpectedTat(403, "{\"detail\":\"Invalid token\"}"));
  assert.equal(formatTransit(5, "2026-10-19").by, "19 Oct");
  assert.equal(formatTransit(5, null, new Date("2026-10-14T06:30:00.000Z")).estimateSource, "delhivery_tat");
  const calls: string[] = [];
  const ready = policyFromEnv({
    DELHIVERY_API_TOKEN: "server-token",
    DELHIVERY_LIVE_READS_ENABLED: "1",
    DELHIVERY_ENVIRONMENT: "production",
    DELHIVERY_ORIGIN_PIN: "201304",
    SHIPPING_EXPRESS_PAISE: "12900",
  });
  const result = await expectedTat(ready, "110001", "S", async (url) => {
    calls.push(url);
    return new Response(body, { status: 200 });
  });
  assert.equal(result.status, "available");
  assert.match(calls[0], /origin_pin=201304/);
  assert.match(calls[0], /destination_pin=110001/);
  assert.match(calls[0], /mot=S/);
  const skipped = await expectedTat({ ...ready, originPin: "" }, "110001", "S", async () => {
    throw new Error("origin PIN was empty");
  });
  assert.equal(skipped.status, "not_configured");
  const options = applyLaneEstimates(buildShippingOptions(ready, { status: "available", prepaid: true, cod: false }, 50000, charges).options, {
    standard: { estimate: "5 days", estimateSource: "delhivery_tat" },
    express: { estimate: "3 days", estimateSource: "delhivery_tat" },
  });
  assert.equal(options.find((option) => option.id === "standard")?.estimateSource, "delhivery_tat");
  assert.equal(options.find((option) => option.id === "express")?.estimate, "3 days");
});

test("a store estimate becomes a delivery-by date in India", () => {
  const now = new Date("2026-10-14T06:30:00.000Z");
  assert.deepEqual(deliveryBy("3-5 days", now), { by: "19 Oct", estimate: "3-5 days" });
  assert.equal(deliveryBy("", now).estimate, "5 days");
  assert.equal(describePin("not_configured").available, true);
  assert.equal(describePin("available").label, "Serviceable");
  assert.equal(describePin("unavailable", "713141").label, "Not serviceable");
  assert.equal(describePin("unavailable", "713141").message, "We can't deliver to PIN 713141. Try another PIN.");
  assert.equal(describePin("temporary_failure").label, "Unable to verify");
});

test("mock tracking walks one test status at a time and stops at delivered", () => {
  assert.equal(nextMockStep("not_created").state, "booked");
  assert.equal(nextMockStep("booked").providerStatus, "Test · Pickup confirmed");
  assert.equal(nextMockStep("out_for_delivery").state, "delivered");
  assert.equal(nextMockStep("delivered"), null);
});

test("mock mode stays off in production and does not enable live booking", () => {
  const mock = policyFromEnv({ DELHIVERY_MODE: "mock", DELHIVERY_ENABLED: "0", NODE_ENV: "development" });
  assert.equal(mock.mode, "mock");
  assert.equal(mock.delhiveryEnabled, false);
  const blocked = policyFromEnv({ DELHIVERY_MODE: "mock", DELHIVERY_ENABLED: "0", NODE_ENV: "production" });
  assert.equal(blocked.mode, "off");
});

test("push payloads without a waybill do not identify an order", () => {
  assert.equal(waybillFromPush({ Status: "Delivered" }), null);
  const parsed = waybillFromPush({ Shipment: { AWB: "123456789012", Status: { Status: "Delivered", StatusDateTime: "2026-10-13T10:00:00" } } });
  assert.equal(parsed?.waybill, "123456789012");
  assert.equal(parsed?.events[0].state, "delivered");
});

test("development cannot create a shipment, request pickup, or track a test waybill", async () => {
  const policy = policyFromEnv({
    DELHIVERY_API_TOKEN: "server-token",
    DELHIVERY_ENABLED: "1",
    DELHIVERY_ENVIRONMENT: "production",
    DELHIVERY_LIVE_READS_ENABLED: "1",
    DELHIVERY_LIVE_SHIPMENT_CREATION_ENABLED: "1",
    DELHIVERY_MODE: "live",
    NODE_ENV: "development",
  });
  assert.equal(policy.liveReadsEnabled, true);
  assert.equal(policy.liveMutationsEnabled, false);
  const stagingDev = policyFromEnv({
    DELHIVERY_API_TOKEN: "server-token",
    DELHIVERY_ENABLED: "1",
    DELHIVERY_ENVIRONMENT: "staging",
    DELHIVERY_LIVE_SHIPMENT_CREATION_ENABLED: "1",
    NODE_ENV: "development",
  });
  assert.equal(stagingDev.liveMutationsEnabled, true);
  const calls: string[] = [];
  const fetchImpl = async (url: string) => {
    calls.push(url);
    return new Response("{}", { status: 200 });
  };
  const manifest = {
    orderNumber: "SK-TEST",
    name: "Test",
    address: "1 Test Road",
    city: "Delhi",
    state: "Delhi",
    pin: "110001",
    phone: "9999999999",
    paymentMode: "Pre-paid" as const,
    amountRupees: 100,
    codAmountRupees: 0,
    weightGrams: 500,
    shippingMode: "Surface" as const,
    products: "Soap",
  };
  await assert.rejects(() => createManifest(policy, manifest, fetchImpl), (error: unknown) => error instanceof DelhiveryError);
  await assert.rejects(() => requestPickup(policy, 1, fetchImpl), (error: unknown) => error instanceof DelhiveryError);
  await assert.rejects(() => trackWaybill(policy, "TESTABC123", fetchImpl), (error: unknown) => error instanceof DelhiveryError);
  assert.deepEqual(calls, []);
  const foreignHost = policyFromEnv({
    DELHIVERY_API_TOKEN: "server-token",
    DELHIVERY_LIVE_READS_ENABLED: "1",
    DELHIVERY_BASE_URL: "https://example.com",
  });
  assert.equal(foreignHost.liveReadsEnabled, false);
  assert.equal(foreignHost.liveMutationsEnabled, false);
});

test("packing slip classifies a label link, label data, and a PDF", () => {
  const link = parsePackingSlip(200, "application/json", JSON.stringify({
    packages: [{ wbn: "84649910000022", pdf_download_link: "https://express-hq.s3.ap-south-1.amazonaws.com/label.pdf", pdf_encoding: "raw" }],
    packages_found: 1,
  }), "4R", true);
  assert.equal(link.kind, "link");
  assert.equal(link.expiresInSeconds, 86400);
  assert.equal(link.downloadUrl.includes("label.pdf"), true);
  assert.equal(link.fields.some((field) => field.key === "pdf_encoding"), false);
  const data = parsePackingSlip(200, "application/json", JSON.stringify({
    packages: [{ wbn: "84649910000022", name: "Asha", pin: "110001", error: "" }],
    packages_found: 1,
  }), "A4", false);
  assert.equal(data.kind, "data");
  assert.deepEqual(data.fields.map((field) => field.key), ["wbn", "name", "pin"]);
  const pdf = parsePackingSlip(200, "application/pdf", "%PDF-1.4", "A4", true);
  assert.equal(pdf.kind, "pdf");
  assert.throws(() => parsePackingSlip(200, "application/json", JSON.stringify({ packages: [{ error: "Waybill not found" }], packages_found: 1 }), "A4", true));
});

test("packing slip requests the chosen size and pdf flag as strings", async () => {
  const live = policyFromEnv({
    DELHIVERY_API_TOKEN: "server-token",
    DELHIVERY_LIVE_READS_ENABLED: "1",
    DELHIVERY_BASE_URL: "https://staging-express.delhivery.com",
  });
  const calls: string[] = [];
  const fetchImpl = async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify({ packages: [{ wbn: "84649910000022", pdf_download_link: "https://express-hq.s3.amazonaws.com/label.pdf" }], packages_found: 1 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const label = await fetchPackingSlip(live, "84649910000022", "4R", true, fetchImpl);
  assert.equal(label.kind, "link");
  assert.equal(calls[0].includes("pdf=true"), true);
  assert.equal(calls[0].includes("pdf_size=4R"), true);
  assert.equal(calls[0].includes("wbns=84649910000022"), true);
  await assert.rejects(() => fetchPackingSlip(live, "TESTABC", "A4", true, fetchImpl), (error: unknown) => error instanceof DelhiveryError);
  assert.equal(calls.length, 1);
});
