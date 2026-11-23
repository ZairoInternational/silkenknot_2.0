import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_WELCOME_SCRATCH,
  normalizeWelcomeScratch,
  publicWelcomeScratch,
} from "./content";

test("normalizeWelcomeScratch keeps defaults for empty input", () => {
  assert.deepEqual(normalizeWelcomeScratch(undefined), DEFAULT_WELCOME_SCRATCH);
});

test("normalizeWelcomeScratch accepts enable toggle and prize fields", () => {
  const settings = normalizeWelcomeScratch({
    enabled: false,
    prizeCode: "  soft10  ",
    prizeLabel: " Soft 10% off ",
  });
  assert.equal(settings.enabled, false);
  assert.equal(settings.prizeCode, "SOFT10");
  assert.equal(settings.prizeLabel, "Soft 10% off");
});

test("publicWelcomeScratch hides disabled offers", () => {
  assert.equal(publicWelcomeScratch({ ...DEFAULT_WELCOME_SCRATCH, enabled: false }), null);
  assert.deepEqual(publicWelcomeScratch(DEFAULT_WELCOME_SCRATCH), {
    prizeCode: "RITUAL10",
    prizeLabel: "10% off your order",
  });
});
