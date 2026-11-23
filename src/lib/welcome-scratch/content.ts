export const WELCOME_SCRATCH_CONTENT_ID = "welcome-scratch";

export type WelcomeScratchSettings = {
  enabled: boolean;
  prizeCode: string;
  prizeLabel: string;
};

export const DEFAULT_WELCOME_SCRATCH: WelcomeScratchSettings = {
  enabled: true,
  prizeCode: "RITUAL10",
  prizeLabel: "10% off your order",
};

function asString(value: unknown, fallback: string, max: number) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

function asPrizeCode(value: unknown, fallback: string) {
  const raw = asString(value, fallback, 32).toUpperCase();
  const cleaned = raw.replace(/[^A-Z0-9_-]/g, "");
  return cleaned || fallback;
}

export function normalizeWelcomeScratch(input: unknown): WelcomeScratchSettings {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_WELCOME_SCRATCH.enabled,
    prizeCode: asPrizeCode(raw.prizeCode, DEFAULT_WELCOME_SCRATCH.prizeCode),
    prizeLabel: asString(raw.prizeLabel, DEFAULT_WELCOME_SCRATCH.prizeLabel, 60),
  };
}

/** Storefront payload when the modal should render; null when disabled. */
export function publicWelcomeScratch(settings: WelcomeScratchSettings) {
  if (!settings.enabled) return null;
  return {
    prizeCode: settings.prizeCode,
    prizeLabel: settings.prizeLabel,
  };
}

export type WelcomeScratchPublic = NonNullable<ReturnType<typeof publicWelcomeScratch>>;
