import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PRODUCT_CLAIMS,
  normalizeProductClaims,
  toggleProductClaim,
} from "./product-claims";

describe("product claims", () => {
  it("defaults missing claims to plant-based, cruelty-free, made-in-india", () => {
    assert.deepEqual(normalizeProductClaims(undefined), DEFAULT_PRODUCT_CLAIMS);
    assert.deepEqual(normalizeProductClaims(null), DEFAULT_PRODUCT_CLAIMS);
    assert.ok(DEFAULT_PRODUCT_CLAIMS.includes("plant-based"));
    assert.ok(DEFAULT_PRODUCT_CLAIMS.includes("cruelty-free"));
    assert.ok(DEFAULT_PRODUCT_CLAIMS.includes("made-in-india"));
  });

  it("keeps an explicit empty list empty", () => {
    assert.deepEqual(normalizeProductClaims([]), []);
  });

  it("filters unknown ids and keeps catalog order", () => {
    assert.deepEqual(normalizeProductClaims(["made-in-india", "nope", "plant-based"]), [
      "plant-based",
      "made-in-india",
    ]);
  });

  it("toggles claims from the default set", () => {
    const off = toggleProductClaim(undefined, "plant-based", false);
    assert.deepEqual(off, ["cruelty-free", "made-in-india"]);
    const on = toggleProductClaim(off, "paraben-free", true);
    assert.deepEqual(on, ["cruelty-free", "paraben-free", "made-in-india"]);
  });
});
