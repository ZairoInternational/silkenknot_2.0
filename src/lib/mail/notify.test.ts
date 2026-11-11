import assert from "node:assert/strict";
import test from "node:test";
import { confirmationVariables, deliveredVariables, formatDeliveredAt, orderLinkSuffix } from "./notify";

test("order WhatsApp variables follow the approved template order", () => {
  assert.deepEqual(confirmationVariables({ customerName: "Asha Menon", number: "SK1042", total: 2499 }), [
    "Asha",
    "SK1042",
    "₹2,499",
  ]);
  assert.deepEqual(
    deliveredVariables({
      customerName: "Asha Menon",
      number: "SK1042",
      items: [
        { name: "Silk Body Butter", quantity: 2 },
        { name: "Lavender Soap", quantity: 1 },
      ],
      address: { line1: "12 Rose Lane", line2: "Indiranagar", city: "Bengaluru", postal: "560038" },
      deliveredAt: "2026-11-11T07:51:00.000Z",
    }),
    [
      "Asha",
      "SK1042",
      "Silk Body Butter x2, Lavender Soap x1",
      "12 Rose Lane, Indiranagar, Bengaluru, 560038",
      formatDeliveredAt("2026-11-11T07:51:00.000Z"),
    ],
  );
  assert.equal(confirmationVariables({ customerName: "  ", number: "SK1", total: 0 })[0], "there");
  assert.equal(orderLinkSuffix("ord_abc123"), "ord_abc123");
});
