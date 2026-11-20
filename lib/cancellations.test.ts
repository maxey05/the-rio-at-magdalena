import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { recordRefund, REFUND_REF_ERROR, refundOwed } from "./cancellations.ts";
import { STATUSES } from "./rules.ts";

describe("refundOwed", () => {
  it("is true only when money was sent: payment_review and confirmed", () => {
    const owed = STATUSES.filter((status) => refundOwed(status));
    assert.deepEqual(owed, ["payment_review", "confirmed"]);
  });

  it("is false for every other status", () => {
    for (const status of ["awaiting_payment", "checked_in", "completed", "expired", "rejected", "cancelled", "no_show"] as const) {
      assert.equal(refundOwed(status), false, status);
    }
  });

  it("covers all nine statuses", () => {
    assert.equal(STATUSES.length, 9);
  });
});

describe("recordRefund", () => {
  it("rejects a bad reference before touching the database", async () => {
    for (const raw of ["", "123", "12345678901234", "abcdefghijklmn", "1234 5678 9012"]) {
      assert.deepEqual(await recordRefund("not-a-real-id", raw), { kind: "invalid", errors: { ref: REFUND_REF_ERROR } });
    }
  });
});
