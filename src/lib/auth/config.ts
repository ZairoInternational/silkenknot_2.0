export const SESSION_COOKIE = "silkknot_session";
export const CSRF_COOKIE = "silkknot_csrf";

const MINUTE = 60;
const DAY = 60 * 60 * 24;

function intEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16 && !secret.includes("replace-with")) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Set AUTH_SECRET to a long random string before using authentication.");
  }
  return "silkknot-dev-session";
}

export function otpConfig() {
  return {
    ttlSeconds: intEnv("OTP_TTL_SECONDS", 5 * MINUTE),
    maxAttempts: intEnv("OTP_MAX_ATTEMPTS", 5),
    resendSeconds: intEnv("OTP_RESEND_SECONDS", 60),
    destinationLimit: intEnv("OTP_DEST_LIMIT", 5),
    destinationWindowSeconds: intEnv("OTP_DEST_WINDOW_SECONDS", 60 * MINUTE),
    idleSeconds: intEnv("SESSION_IDLE_SECONDS", 14 * DAY),
    absoluteSeconds: intEnv("SESSION_ABSOLUTE_SECONDS", 30 * DAY),
  };
}

/** Development inbox only. Ignored whenever NODE_ENV is production. */
export function devOtpSinkEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.OTP_DEV_SINK === "1";
}
