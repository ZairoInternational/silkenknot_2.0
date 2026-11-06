import assert from "node:assert/strict";
import test from "node:test";
import { confirmationVariables, deliveredVariables, orderLinkSuffix } from "./notify";

test("order WhatsApp variables follow the approved template order", () => {
  assert.deepEqual(confirmationVariables({ customerName: "Asha Menon", number: "SK1042", total: 2499 }), [
    "Asha",
    "SK1042",
    "₹2,499",
  ]);
  assert.deepEqual(deliveredVariables({ customerName: "Asha Menon", number: "SK1042" }), ["Asha", "SK1042"]);
  assert.equal(confirmationVariables({ customerName: "  ", number: "SK1", total: 0 })[0], "there");
  assert.equal(orderLinkSuffix("ord_abc123"), "ord_abc123");
});
