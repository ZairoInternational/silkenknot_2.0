import type { SupportQuestionId } from "./types";

const KEY = "silkknot_support_intent";

export type SupportIntent = {
  questionId: SupportQuestionId;
  openedAt: number;
};

/** Persist only a topic id across OTP login — never order payloads. */
export function saveSupportIntent(questionId: SupportQuestionId) {
  if (typeof window === "undefined") return;
  try {
    const payload: SupportIntent = { questionId, openedAt: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

export function consumeSupportIntent(maxAgeMs = 30 * 60 * 1000): SupportQuestionId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as SupportIntent;
    if (!parsed?.questionId || typeof parsed.openedAt !== "number") return null;
    if (Date.now() - parsed.openedAt > maxAgeMs) return null;
    return parsed.questionId;
  } catch {
    return null;
  }
}
