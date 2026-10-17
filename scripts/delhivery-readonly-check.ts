import { checkServiceability, DelhiveryError } from "../src/lib/shipping/delhivery";
import { policyFromEnv } from "../src/lib/shipping/policy";

const pin = process.argv[2] || "110001";
if (!/^\d{6}$/.test(pin)) {
  console.log(JSON.stringify({ result: "skipped", reason: "PIN must be 6 digits." }));
  process.exit(1);
}

const policy = policyFromEnv({
  ...process.env,
  NODE_ENV: "development",
  DELHIVERY_MODE: "mock",
  DELHIVERY_LIVE_READS_ENABLED: "1",
  DELHIVERY_LIVE_SHIPMENT_CREATION_ENABLED: "0",
  DELHIVERY_ENVIRONMENT: "production",
  DELHIVERY_BASE_URL: "https://track.delhivery.com",
});

console.log(JSON.stringify({
  preflight: {
    operation: "PIN serviceability",
    method: "GET",
    host: "track.delhivery.com",
    path: "/c/api/pin-codes/json/",
    readOnly: true,
    createsShipment: false,
    destinationPin: pin,
    originPin: null,
    tokenPresent: Boolean(policy.token),
    liveMutationsEnabled: policy.liveMutationsEnabled,
  },
}));

async function main() {
  if (!policy.token) {
    console.log(JSON.stringify({ result: "skipped", reason: "DELHIVERY_API_TOKEN is empty." }));
    return;
  }
  if (policy.liveMutationsEnabled) {
    console.log(JSON.stringify({ result: "skipped", reason: "Refusing to run while live shipment changes are enabled." }));
    process.exitCode = 1;
    return;
  }
  try {
    const checked = await checkServiceability(policy, pin);
    console.log(JSON.stringify({
      result: checked.status === "available" ? "Serviceable" : checked.status === "unavailable" ? "Not serviceable" : "Unable to verify",
      status: checked.status,
      prepaid: "prepaid" in checked ? checked.prepaid : null,
      cod: "cod" in checked ? checked.cod : null,
      pickup: "pickup" in checked ? checked.pickup : null,
    }));
  } catch (error) {
    const message = error instanceof DelhiveryError ? error.message : "The serviceability request failed.";
    console.log(JSON.stringify({ result: "failed", message }));
    process.exitCode = 1;
  }
}

void main();
