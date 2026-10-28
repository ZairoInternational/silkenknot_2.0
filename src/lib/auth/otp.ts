import { createHmac, randomInt, randomUUID, timingSafeEqual, createHash } from "crypto";
import type { Db } from "mongodb";
import { authSecret, devOtpSinkEnabled, otpConfig } from "@/lib/auth/config";
import { sendEmailOtp, sendWhatsAppOtp } from "@/lib/auth/deliver";

export type OtpChannel = "email" | "whatsapp";
export type OtpPurpose = "login" | "link-email" | "link-phone" | "admin-mfa" | "admin-reset";

type Challenge = {
  id: string;
  destination: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  verifier: string;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  consumedAt: string | null;
  createdAt: string;
  deliveryStatus: string;
  userId?: string;
  ipHash: string;
};

function verifierFor(id: string, code: string) {
  return createHmac("sha256", authSecret()).update(`${id}:${code}`).digest("base64url");
}

function codesMatch(stored: string, submitted: string) {
  const a = Buffer.from(stored);
  const b = Buffer.from(submitted);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hashIp(ip: string) {
  return createHash("sha256").update(`${authSecret()}:${ip}`).digest("base64url");
}

export async function requestOtp(
  db: Db,
  input: { destination: string; channel: OtpChannel; purpose: OtpPurpose; ip: string; userId?: string },
) {
  const config = otpConfig();
  const now = Date.now();
  const challenges = db.collection<Challenge>("otpChallenges");
  const windowStart = new Date(now - config.destinationWindowSeconds * 1000).toISOString();
  const recent = await challenges.countDocuments({ destination: input.destination, createdAt: { $gt: windowStart } });
  if (recent >= config.destinationLimit) {
    return { ok: false as const, status: 429, message: "Please wait before requesting another code." };
  }
  const ipHash = hashIp(input.ip);
  const ipRecent = await challenges.countDocuments({ ipHash, createdAt: { $gt: windowStart } });
  if (ipRecent >= config.destinationLimit * 2) {
    return { ok: false as const, status: 429, message: "Please wait before requesting another code." };
  }

  const cooldownStart = new Date(now - config.resendSeconds * 1000).toISOString();
  const cooling = await challenges.findOne(
    { destination: input.destination, purpose: input.purpose, consumedAt: null, createdAt: { $gt: cooldownStart } },
    { sort: { createdAt: -1 } },
  );
  if (cooling && cooling.expiresAt > new Date(now).toISOString()) {
    return {
      ok: true as const,
      challengeId: cooling.id,
      expiresAt: cooling.expiresAt,
      resendAt: new Date(new Date(cooling.createdAt).getTime() + config.resendSeconds * 1000).toISOString(),
      resent: false,
    };
  }

  const id = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const minutes = Math.max(1, Math.round(config.ttlSeconds / 60));
  const emailPurpose = input.purpose === "login" ? "login" : "verify";
  const delivery = input.channel === "email"
    ? await sendEmailOtp(input.destination, code, minutes, emailPurpose)
    : await sendWhatsAppOtp(input.destination, code);
  if (!delivery.ok) {
    const message = delivery.status === "unconfigured"
      ? "Code delivery is not configured on this server."
      : "We couldn’t send a code. Try again shortly.";
    return { ok: false as const, status: 503, message };
  }

  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + config.ttlSeconds * 1000).toISOString();
  await challenges.insertOne({
    id,
    destination: input.destination,
    channel: input.channel,
    purpose: input.purpose,
    verifier: verifierFor(id, code),
    expiresAt,
    attempts: 0,
    maxAttempts: config.maxAttempts,
    consumedAt: null,
    createdAt,
    deliveryStatus: delivery.status,
    userId: input.userId,
    ipHash,
  });
  if (Math.random() < 0.05) {
    await challenges.deleteMany({ expiresAt: { $lt: new Date(now - 24 * 60 * 60 * 1000).toISOString() } });
  }
  return {
    ok: true as const,
    challengeId: id,
    expiresAt,
    resendAt: new Date(now + config.resendSeconds * 1000).toISOString(),
    resent: true,
    devCode: devOtpSinkEnabled() && delivery.status === "dev-sink" ? code : undefined,
  };
}

export async function verifyOtp(db: Db, challengeId: string, code: string) {
  const challenges = db.collection<Challenge>("otpChallenges");
  const now = new Date().toISOString();
  const current = await challenges.findOne({ id: challengeId });
  if (!current || current.consumedAt || current.expiresAt <= now || current.attempts >= current.maxAttempts) {
    return { ok: false as const, message: "That code is incorrect or has expired." };
  }
  const submitted = verifierFor(current.id, code.replace(/\D/g, ""));
  if (!codesMatch(current.verifier, submitted)) {
    const updated = await challenges.findOneAndUpdate(
      { id: current.id, consumedAt: null, attempts: { $lt: current.maxAttempts } },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" },
    );
    const exhausted = (updated?.attempts ?? current.attempts + 1) >= current.maxAttempts;
    return { ok: false as const, message: exhausted ? "That code is no longer valid. Request a new one." : "That code is incorrect or has expired." };
  }
  const consumed = await challenges.findOneAndUpdate(
    { id: current.id, consumedAt: null, expiresAt: { $gt: now }, attempts: { $lt: current.maxAttempts }, verifier: submitted },
    { $set: { consumedAt: now } },
    { returnDocument: "after" },
  );
  if (!consumed) return { ok: false as const, message: "That code is incorrect or has expired." };
  return { ok: true as const, challenge: consumed };
}
