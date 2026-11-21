import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCreateError } from "./bookings.ts";

describe("parseCreateError", () => {
  it("reads the slot and night from a slot_taken detail", () => {
    assert.deepEqual(parseCreateError("slot_taken", "slot_id=4 night=2026-12-12"), {
      ok: false,
      code: "slot_taken",
      slotId: 4,
      night: "2026-12-12",
    });
  });

  it("copes with a missing detail", () => {
    assert.deepEqual(parseCreateError("slot_taken", null), { ok: false, code: "slot_taken", slotId: null, night: null });
  });

  it("reads the date from site_full and tents_unavailable", () => {
    assert.deepEqual(parseCreateError("site_full:2026-12-13", null), { ok: false, code: "site_full", date: "2026-12-13" });
    assert.deepEqual(parseCreateError("tents_unavailable:2026-12-14", null), {
      ok: false,
      code: "tents_unavailable",
      date: "2026-12-14",
    });
  });

  it("maps closed, input problems and anything unknown", () => {
    assert.deepEqual(parseCreateError("closed", null), { ok: false, code: "closed" });
    for (const code of ["invalid_input", "slots_required", "slot_invalid", "slot_capacity"]) {
      assert.deepEqual(parseCreateError(code, null), { ok: false, code: "invalid" });
    }
    assert.deepEqual(parseCreateError("settings_missing", null), { ok: false, code: "error" });
    assert.deepEqual(parseCreateError("site_full:tomorrow", null), { ok: false, code: "error" });
  });
});
