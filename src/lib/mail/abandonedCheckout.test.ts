import assert from "node:assert/strict";
import test from "node:test";
import {
  abandonedReminderDelayMs,
  abandonedVariables,
  isAbandonedReminderDue,
  type AbandonedCandidate,
} from "./abandonedCheckout";

function base(overrides: Partial<AbandonedCandidate> = {}): AbandonedCandidate {
  return {
    id: "ord_1",
    customerName: "Asha Menon",
    phone: "+919876543210",
    paymentState: "cancelled",
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    whatsappMarketingConsent: { optedIn: true },
    ...overrides,
  };
}

test("abandoned WhatsApp variables use first name only", () => {
  assert.deepEqual(abandonedVariables("Asha Menon"), ["Asha"]);
  assert.deepEqual(abandonedVariables("  "), ["there"]);
});

test("reminder delay defaults to 30 minutes", () => {
  const previous = process.env.ABANDONED_CHECKOUT_REMINDER_MINUTES;
  delete process.env.ABANDONED_CHECKOUT_REMINDER_MINUTES;
  assert.equal(abandonedReminderDelayMs(), 30 * 60 * 1000);
  process.env.ABANDONED_CHECKOUT_REMINDER_MINUTES = "45";
  assert.equal(abandonedReminderDelayMs(), 45 * 60 * 1000);
  if (previous === undefined) delete process.env.ABANDONED_CHECKOUT_REMINDER_MINUTES;
  else process.env.ABANDONED_CHECKOUT_REMINDER_MINUTES = previous;
});

test("eligibility requires consent, age, unpaid, and no prior notice", () => {
  const delay = 30 * 60 * 1000;
  const now = Date.now();
  assert.equal(isAbandonedReminderDue(base(), now, delay), true);
  assert.equal(isAbandonedReminderDue(base({ whatsappMarketingConsent: { optedIn: false } }), now, delay), false);
  assert.equal(isAbandonedReminderDue(base({ whatsappMarketingConsent: undefined }), now, delay), false);
  assert.equal(isAbandonedReminderDue(base({ paymentState: "captured" }), now, delay), false);
  assert.equal(isAbandonedReminderDue(base({ paymentState: "authorized" }), now, delay), false);
  assert.equal(isAbandonedReminderDue(base({ paymentState: "pending" }), now, delay), true);
  assert.equal(
    isAbandonedReminderDue(base({ notices: { whatsappAbandonedAt: new Date().toISOString() } }), now, delay),
    false,
  );
  assert.equal(
    isAbandonedReminderDue(base({ createdAt: new Date(now - 10 * 60 * 1000).toISOString() }), now, delay),
    false,
  );
  assert.equal(isAbandonedReminderDue(base({ phone: "" }), now, delay), false);
});
