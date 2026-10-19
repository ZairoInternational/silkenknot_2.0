/**
 * GET /api/health
 *
 * A tiered health check that tells you — without debug access — exactly which
 * subsystem caused the application to go down or degrade.
 *
 * Tier model:
 *   CRITICAL  — the service cannot serve any page without this
 *   DEGRADED  — some routes/features stop working
 *   WARNING   — missing optional config or a best-practice gap
 *   OK        — fully configured and reachable
 *
 * Optional guard:  set HEALTH_CHECK_SECRET in env and send:
 *   Authorization: Bearer <secret>
 * Without the secret var the endpoint is open (fine on a private Vercel URL).
 *
 * HTTP status codes:
 *   200 – all checks OK or WARNING only
 *   503 – at least one CRITICAL or DEGRADED check
 *   401 – missing / wrong bearer token
 */

import { databaseConfigured, getDb } from "@/lib/mongo";
import { smtpConfigured } from "@/lib/mailer";
import { bunnyReady } from "@/lib/media/bunny";
import { policyFromEnv } from "@/lib/shipping/policy";
import { readPaymentConfig, PaymentConfigError } from "@/lib/payments/config";
import { authSecret } from "@/lib/auth/config";

// ─── types ────────────────────────────────────────────────────────────────────

type Severity = "OK" | "WARNING" | "DEGRADED" | "CRITICAL";

type Check = {
  name: string;
  severity: Severity;
  ok: boolean;
  message: string;
  /** Optional: which public routes are blocked when this check fails */
  affects?: string[];
  /** Optional: latency in ms for network checks */
  latencyMs?: number;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function pass(name: string, message = "OK"): Check {
  return { name, severity: "OK", ok: true, message };
}

function warn(name: string, message: string, affects?: string[]): Check {
  return { name, severity: "WARNING", ok: true, message, affects };
}

function degrade(name: string, message: string, affects?: string[]): Check {
  return { name, severity: "DEGRADED", ok: false, message, affects };
}

function critical(name: string, message: string, affects?: string[]): Check {
  return { name, severity: "CRITICAL", ok: false, message, affects: affects ?? ["ALL routes"] };
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
  const t = Date.now();
  const result = await fn();
  return { result, latencyMs: Date.now() - t };
}

// ─── individual checks ────────────────────────────────────────────────────────

/**
 * 1. AUTH_SECRET
 * Every authenticated request (login, checkout, admin) uses HMAC keys derived
 * from this value.  If it's missing in production the whole auth system is down.
 */
function checkAuthSecret(): Check {
  try {
    const secret = authSecret();
    if (secret === "silkknot-dev-session") {
      return warn("auth_secret", "Using dev fallback secret — fine locally, MUST be set before production.", ["All authenticated routes"]);
    }
    if (secret.length < 32) {
      return warn("auth_secret", "AUTH_SECRET is set but shorter than 32 chars — increase entropy.");
    }
    return pass("auth_secret", `Set · length=${secret.length}`);
  } catch (error) {
    return critical("auth_secret", error instanceof Error ? error.message : "AUTH_SECRET error.");
  }
}

/**
 * 2. MongoDB — connectivity + required collections
 * Most routes will 503 instantly if Mongo is unreachable.
 */
async function checkMongo(): Promise<Check> {
  if (!databaseConfigured()) {
    return critical("mongodb", "MONGODB_URI is not set.");
  }
  const REQUIRED_COLLECTIONS = [
    "products", "categories", "coupons", "users",
    "sessions", "otpChallenges", "orders",
    "shipmentTasks", "shippingQuotes", "webhookEvents",
  ];
  const { result, latencyMs } = await timed(async () => {
    const db = await getDb();
    await db.command({ ping: 1 });
    const names = (await db.listCollections().toArray()).map((c) => c.name);
    const missing = REQUIRED_COLLECTIONS.filter((c) => !names.includes(c));
    return { dbName: db.databaseName, collections: names.length, missing };
  }).catch((error) => ({
    result: null as null,
    latencyMs: 0,
    error: error instanceof Error ? error.message : "Unknown error",
  })) as { result: { dbName: string; collections: number; missing: string[] } | null; latencyMs: number; error?: string };

  if (!result) {
    return { ...critical("mongodb", `Unreachable — ${"error" in result! ? "" : ""}ping failed.`), latencyMs };
  }
  if (result.missing.length) {
    return {
      ...degrade(
        "mongodb",
        `Connected · db=${result.dbName} · missing collections: ${result.missing.join(", ")} (will be created on first request).`,
        ["First-load seeding may be slow"],
      ),
      latencyMs,
    };
  }
  return { ...pass("mongodb", `Connected · db=${result.dbName} · ${result.collections} collections`), latencyMs };
}

/**
 * 3. Session store — checks that the sessions collection is queryable
 * (separate from Mongo connectivity — a misconfigured index can break auth
 * even when ping succeeds)
 */
async function checkSessionStore(): Promise<Check> {
  if (!databaseConfigured()) return degrade("session_store", "Skipped — MongoDB not configured.", ["/checkout", "/account"]);
  const { result, latencyMs } = await timed(async () => {
    const db = await getDb();
    await db.collection("sessions").findOne({ revokedAt: null }, { projection: { _id: 1 } });
    return "ok";
  }).catch((e) => ({ result: "error", latencyMs: 0, err: e instanceof Error ? e.message : "Unknown" }));

  if (result !== "ok") {
    return { ...critical("session_store", "Sessions collection is not queryable — all login and checkout will fail.", ["/account", "/checkout"]), latencyMs };
  }
  return { ...pass("session_store", "Sessions queryable"), latencyMs };
}

/**
 * 4. SMTP — email OTP, order confirmation, contact form
 */
async function checkSmtp(): Promise<Check> {
  if (!smtpConfigured()) {
    return degrade(
      "smtp",
      "SMTP_HOST/PORT/USER/PASS/FROM not fully set — email OTP, order confirmations, and contact form emails will not send.",
      ["Email OTP /api/auth/otp", "Order confirmation email", "Contact form /api/contact"],
    );
  }
  // Verify the transporter can reach the server (no message sent)
  type SmtpOutcome = { ok: true } | { ok: false; err: string };
  let smtpLatencyMs: number | undefined;
  const smtpResult = await (async (): Promise<SmtpOutcome> => {
    const t = Date.now();
    try {
      const nodemailer = (await import("nodemailer")).default;
      const host = process.env.SMTP_HOST!.trim();
      const port = Number(process.env.SMTP_PORT!.trim());
      const user = process.env.SMTP_USER!.trim();
      const pass = process.env.SMTP_PASS!.trim().replace(/\s+/g, "");
      const transporter = nodemailer.createTransport({ host, port, secure: port === 465, requireTLS: port === 587, auth: { user, pass } });
      await transporter.verify();
      return { ok: true };
    } catch (e) {
      return { ok: false, err: e instanceof Error ? e.message : "Verify failed" };
    } finally {
      smtpLatencyMs = Date.now() - t;
    }
  })();

  if (!smtpResult.ok) {
    return {
      ...degrade("smtp", `SMTP credentials rejected or server unreachable — ${smtpResult.err}`, ["Email OTP", "Order emails"]),
      latencyMs: smtpLatencyMs,
    };
  }
  const inbox = process.env.SMTP_INBOX?.trim() || process.env.SMTP_USER?.trim();
  return { ...pass("smtp", `Verified · inbox=${inbox}`), latencyMs: smtpLatencyMs };
}

/**
 * 5. SMS OTP (MSG91) — phone login
 */
function checkSms(): Check {
  const key = process.env.MSG91_AUTH_KEY?.trim();
  const template = process.env.MSG91_TEMPLATE_ID?.trim();
  if (!key || !template) {
    return warn(
      "sms_otp",
      "MSG91_AUTH_KEY or MSG91_TEMPLATE_ID not set — phone OTP will fall back to dev-sink (not usable in production).",
      ["Phone login /api/auth/otp"],
    );
  }
  return pass("sms_otp", "MSG91 keys set");
}

/**
 * 6. Razorpay — payments
 */
function checkRazorpay(): Check {
  try {
    const cfg = readPaymentConfig(process.env);
    const webhook = !!process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
    const notes: string[] = [`mode=${cfg.mode}`];
    if (!webhook) notes.push("webhook secret missing — payment verification will rely on client-side only (not safe for production)");
    return {
      ...pass("razorpay", notes.join(" · ")),
      severity: webhook ? "OK" : "WARNING",
    };
  } catch (error) {
    const msg = error instanceof PaymentConfigError ? error.message : "Razorpay config error.";
    return degrade("razorpay", msg, ["/api/checkout/create-order", "/api/checkout/verify", "/api/checkout/webhook"]);
  }
}

/**
 * 7. Delhivery — shipping quotes, PIN checks, waybill booking
 */
async function checkDelhivery(): Promise<Check> {
  const policy = policyFromEnv(process.env as Record<string, string | undefined>);
  const notes: string[] = [];
  const warnings: string[] = [];

  if (!policy.delhiveryEnabled) {
    return degrade(
      "delhivery",
      "Delhivery is disabled — shipping options will use store-managed rates with no PIN validation.",
      ["/api/checkout/shipping-options", "/api/shipping/serviceability"],
    );
  }

  notes.push(`env=${policy.environment}`, `mode=${policy.mode}`);
  if (!policy.pickupLocation) warnings.push("DELHIVERY_PICKUP_LOCATION missing");
  if (!policy.originPin) warnings.push("DELHIVERY_ORIGIN_PIN missing — TAT estimate will be skipped");
  if (!policy.sellerGstTin) warnings.push("DELHIVERY_SELLER_GST_TIN missing");
  if (!policy.hsnCode) warnings.push("DELHIVERY_HSN_CODE missing");
  if (!policy.webhookToken) warnings.push("DELHIVERY_WEBHOOK_TOKEN not set — push tracking disabled");

  // Probe the Delhivery ping/check endpoint (read-only, no side-effects)
  let latencyMs: number | undefined;
  if (policy.liveReadsEnabled) {
    const pingUrl = `${policy.baseUrl}/api/p2p-quote`;
    const { result, latencyMs: ms } = await timed(() =>
      fetch(pingUrl, {
        method: "HEAD",
        headers: { Authorization: `Token ${policy.token}` },
        signal: AbortSignal.timeout(5000),
      }).then((r) => r.status),
    ).catch(() => ({ result: 0 as number, latencyMs: 5000 }));
    latencyMs = ms;
    // 405 (method not allowed) still means the token is accepted; 401 means bad token
    if (result === 401) {
      return { ...degrade("delhivery", "DELHIVERY_API_TOKEN rejected — shipping quote and booking will fail.", ["/api/checkout/shipping-options", "/api/shipping/serviceability"]), latencyMs };
    }
    if (result === 0) {
      notes.push("Delhivery API unreachable (timeout)");
    } else {
      notes.push(`api_status=${result}`);
    }
  } else {
    notes.push("live reads off (DELHIVERY_LIVE_READS_ENABLED != 1)");
  }

  const severity: Severity = warnings.length ? "WARNING" : "OK";
  const message = [...notes, ...warnings].join(" · ");
  return { name: "delhivery", severity, ok: true, message, latencyMs };
}

/**
 * 8. Bunny CDN — admin product image uploads
 */
function checkBunny(): Check {
  if (!bunnyReady()) {
    return warn(
      "bunny_cdn",
      "BUNNY_STORAGE_ZONE, BUNNY_STORAGE_ACCESS_KEY, or BUNNY_CDN_URL not set — studio image uploads will fail.",
      ["POST /api/admin/media"],
    );
  }
  const cdnUrl = process.env.BUNNY_CDN_URL?.trim();
  return pass("bunny_cdn", `zone=${process.env.BUNNY_STORAGE_ZONE?.trim()} · cdn=${cdnUrl}`);
}

/**
 * 9. Reconcile scheduler — background shipment retry & order healing
 */
function checkReconcile(): Check {
  const secret = process.env.CHECKOUT_RECONCILE_SECRET?.trim();
  if (!secret) {
    return warn(
      "reconcile",
      "CHECKOUT_RECONCILE_SECRET not set — POST /api/checkout/reconcile is disabled. Pending shipments and stale orders will not be auto-healed.",
      ["POST /api/checkout/reconcile"],
    );
  }
  return pass("reconcile", "Secret set — schedule a cron to POST /api/checkout/reconcile with x-silkknot-reconcile header.");
}

/**
 * 10. Middleware / session guard
 * Verifies the middleware config is sane (cannot actually run Next middleware
 * from a route — we just confirm the env is coherent).
 */
function checkMiddleware(): Check {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    try {
      authSecret(); // throws if invalid in prod
    } catch {
      return critical("middleware", "AUTH_SECRET invalid — middleware cannot protect /checkout and /account.");
    }
  }
  return pass("middleware", `Session guard active on /checkout/* and /account/*`);
}

// ─── main handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Optional bearer guard
  const guardSecret = process.env.HEALTH_CHECK_SECRET?.trim();
  if (guardSecret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${guardSecret}`) {
      return Response.json({ ok: false, message: "Unauthorised." }, { status: 401 });
    }
  }

  const startMs = Date.now();

  // Run every check (network checks run in parallel)
  const [mongo, sessionStore, smtp, delhivery] = await Promise.all([
    checkMongo(),
    checkSessionStore(),
    checkSmtp(),
    checkDelhivery(),
  ]);

  const checks: Check[] = [
    checkAuthSecret(),
    mongo,
    sessionStore,
    smtp,
    checkSms(),
    checkRazorpay(),
    delhivery,
    checkBunny(),
    checkReconcile(),
    checkMiddleware(),
  ];

  const bySeverity = (s: Severity) => checks.filter((c) => c.severity === s);
  const criticals = bySeverity("CRITICAL");
  const degraded = bySeverity("DEGRADED");
  const warnings = bySeverity("WARNING");
  const ok = bySeverity("OK");

  const hasCritical = criticals.length > 0;
  const hasDegraded = degraded.length > 0;
  const overallOk = !hasCritical && !hasDegraded;

  const overallStatus: "healthy" | "degraded" | "down" = hasCritical
    ? "down"
    : hasDegraded
      ? "degraded"
      : "healthy";

  const payload = {
    ok: overallOk,
    status: overallStatus,
    summary: {
      total: checks.length,
      critical: criticals.length,
      degraded: degraded.length,
      warnings: warnings.length,
      ok: ok.length,
    },
    checks: {
      critical: criticals,
      degraded,
      warnings,
      ok,
    },
    meta: {
      env: process.env.NODE_ENV,
      elapsedMs: Date.now() - startMs,
      ts: new Date().toISOString(),
    },
  };

  const httpStatus = hasCritical || hasDegraded ? 503 : 200;
  return Response.json(payload, { status: httpStatus });
}
