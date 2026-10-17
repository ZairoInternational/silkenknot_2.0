import { NextResponse } from "next/server";
import { databaseConfigured } from "@/lib/mongo";
import { DelhiveryError, checkServiceability, laneEstimates } from "@/lib/shipping/delhivery";
import { deliveryBy, describePin } from "@/lib/shipping/estimate";
import { loadPolicy } from "@/lib/shipping/booking";
import { policyFromEnv } from "@/lib/shipping/policy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const pin = new URL(request.url).searchParams.get("pin")?.trim() || "";
  if (!/^\d{6}$/.test(pin)) return NextResponse.json({ error: "Enter a 6-digit PIN." }, { status: 400 });
  try {
    const policy = databaseConfigured() ? await loadPolicy() : policyFromEnv(process.env);
    const checked = policy.liveReadsEnabled ? await checkServiceability(policy, pin) : { status: "not_configured" as const };
    const result = describePin(checked.status, pin);
    const storeEstimate = deliveryBy(policy.standardEta);
    const lane = checked.status === "available" ? await laneEstimates(policy, pin) : { standard: null, express: null };
    const standard = lane.standard;
    const courierChecked = policy.liveReadsEnabled && checked.status !== "not_configured" && checked.status !== "temporary_failure";
    return NextResponse.json({
      pin,
      available: result.available,
      checked: courierChecked,
      label: result.label,
      message: result.message,
      prepaid: checked.status === "available" ? checked.prepaid : null,
      cod: checked.status === "available" ? checked.cod : null,
      pickup: checked.status === "available" && checked.pickup !== undefined ? checked.pickup : null,
      by: result.available ? (standard?.by || storeEstimate.by) : null,
      estimate: result.available ? (standard?.estimate || storeEstimate.estimate) : "",
      estimateSource: result.available ? (standard?.estimateSource || (policy.standardEta ? "store_policy" : "none")) : null,
      expressEstimate: lane.express?.estimate || "",
      expressEstimateSource: lane.express?.estimateSource || null,
    });
  } catch (error) {
    if (error instanceof DelhiveryError) {
      return NextResponse.json({ error: "Delivery availability could not be checked. Try again." }, { status: 503 });
    }
    return NextResponse.json({ error: "Delivery availability could not be checked." }, { status: 503 });
  }
}
