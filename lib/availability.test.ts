import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "./rules.ts";
import {
  buildDates,
  dateState,
  formatDay,
  holdsSlot,
  monthWeeks,
  parseSelection,
  selectionQuery,
  shiftMonth,
  slotLabel,
  stayLimits,
  takenSlotIds,
  visibleSteps,
  type DateAvailability,
  type NightRow,
  type OccupancyRow,
} from "./stay.ts";

const TODAY = "2026-11-19";
const NOW = new Date("2026-11-19T04:00:00Z");

function row(d: string, overrides: Partial<OccupancyRow> = {}): OccupancyRow {
  return { d, guests: 0, slots_taken: 0, tents: 0, closed: false, ...overrides };
}

function day(d: string, overrides: Partial<DateAvailability> = {}): DateAvailability {
  return { d, state: "available", guestsLeft: 100, tentsLeft: 5, ...overrides };
}

describe("dateState", () => {
  it("is available with plenty of room", () => {
    assert.equal(dateState({ closed: false, guestsLeft: 100, freeSlots: 16 }), "available");
  });

  it("is closed whenever a closure covers the date", () => {
    assert.equal(dateState({ closed: true, guestsLeft: 100, freeSlots: 16 }), "closed");
  });

  it("is full when no guests fit or no slot is free", () => {
    assert.equal(dateState({ closed: false, guestsLeft: 0, freeSlots: 16 }), "full");
    assert.equal(dateState({ closed: false, guestsLeft: 50, freeSlots: 0 }), "full");
  });

  it("is few below 20 guests left, with 20 exactly still available", () => {
    assert.equal(dateState({ closed: false, guestsLeft: 19, freeSlots: 16 }), "few");
    assert.equal(dateState({ closed: false, guestsLeft: 20, freeSlots: 16 }), "available");
  });

  it("is few with one free slot, available with two", () => {
    assert.equal(dateState({ closed: false, guestsLeft: 100, freeSlots: 1 }), "few");
    assert.equal(dateState({ closed: false, guestsLeft: 100, freeSlots: 2 }), "available");
  });

  it("ignores slots for a day tour", () => {
    assert.equal(dateState({ closed: false, guestsLeft: 100, freeSlots: null }), "available");
    assert.equal(dateState({ closed: false, guestsLeft: 5, freeSlots: null }), "few");
  });
});

describe("buildDates", () => {
  it("turns occupancy into guests and tents left", () => {
    const [result] = buildDates([row("2026-12-12", { guests: 85, tents: 3 })], "overnight", 16, DEFAULT_SETTINGS);
    assert.deepEqual(result, { d: "2026-12-12", state: "few", guestsLeft: 15, tentsLeft: 2 });
  });

  it("never reports negative room", () => {
    const [result] = buildDates([row("2026-12-12", { guests: 130, tents: 9 })], "overnight", 16, DEFAULT_SETTINGS);
    assert.equal(result.guestsLeft, 0);
    assert.equal(result.tentsLeft, 0);
    assert.equal(result.state, "full");
  });

  it("marks an overnight date full when every slot is taken but keeps it open for day tours", () => {
    const rows = [row("2026-12-12", { slots_taken: 16, guests: 40 })];
    assert.equal(buildDates(rows, "overnight", 16, DEFAULT_SETTINGS)[0].state, "full");
    assert.equal(buildDates(rows, "day_tour", 16, DEFAULT_SETTINGS)[0].state, "available");
  });

  it("flags closed dates", () => {
    assert.equal(buildDates([row("2026-12-12", { closed: true })], "day_tour", 16, DEFAULT_SETTINGS)[0].state, "closed");
  });
});

describe("holdsSlot and takenSlotIds", () => {
  const future = new Date(NOW.getTime() + 60_000).toISOString();
  const past = new Date(NOW.getTime() - 60_000).toISOString();

  it("counts paid and checked-in bookings", () => {
    for (const status of ["payment_review", "confirmed", "checked_in"] as const) {
      assert.equal(holdsSlot({ status, hold_expires_at: null }, NOW), true);
    }
  });

  it("counts an awaiting_payment hold only until it expires", () => {
    assert.equal(holdsSlot({ status: "awaiting_payment", hold_expires_at: future }, NOW), true);
    assert.equal(holdsSlot({ status: "awaiting_payment", hold_expires_at: past }, NOW), false);
    assert.equal(holdsSlot({ status: "awaiting_payment", hold_expires_at: null }, NOW), false);
  });

  it("ignores ended bookings and missing joins", () => {
    assert.equal(holdsSlot({ status: "cancelled", hold_expires_at: null }, NOW), false);
    assert.equal(holdsSlot(null, NOW), false);
  });

  it("collects only the slots held by live bookings", () => {
    const rows: NightRow[] = [
      { slot_id: 1, night: "2026-12-12", bookings: { status: "confirmed", hold_expires_at: null } },
      { slot_id: 2, night: "2026-12-12", bookings: { status: "awaiting_payment", hold_expires_at: past } },
      { slot_id: 3, night: "2026-12-13", bookings: { status: "awaiting_payment", hold_expires_at: future } },
      { slot_id: 1, night: "2026-12-13", bookings: { status: "confirmed", hold_expires_at: null } },
    ];
    assert.deepEqual([...takenSlotIds(rows, NOW)].sort(), [1, 3]);
  });
});

describe("stayLimits", () => {
  const settings = DEFAULT_SETTINGS;

  it("allows the full max nights when every night is open", () => {
    const dates = Array.from({ length: 10 }, (_, index) => day(`2026-12-${String(10 + index).padStart(2, "0")}`));
    assert.equal(stayLimits(dates, "2026-12-10", 2, "overnight", settings).maxNights, 7);
  });

  it("stops before a full or closed night", () => {
    const dates = [day("2026-12-10"), day("2026-12-11"), day("2026-12-12", { state: "full" }), day("2026-12-13")];
    assert.equal(stayLimits(dates, "2026-12-10", 3, "overnight", settings).maxNights, 2);
    const closed = [day("2026-12-10"), day("2026-12-11", { state: "closed" })];
    assert.equal(stayLimits(closed, "2026-12-10", 1, "overnight", settings).maxNights, 1);
  });

  it("stops where the loaded window ends", () => {
    const dates = [day("2026-12-10"), day("2026-12-11")];
    assert.equal(stayLimits(dates, "2026-12-11", 1, "overnight", settings).maxNights, 1);
  });

  it("limits guests and tents to the tightest chosen night", () => {
    const dates = [
      day("2026-12-10", { guestsLeft: 60, tentsLeft: 4 }),
      day("2026-12-11", { guestsLeft: 30, tentsLeft: 2 }),
      day("2026-12-12", { guestsLeft: 5, tentsLeft: 0 }),
    ];
    const two = stayLimits(dates, "2026-12-10", 2, "overnight", settings);
    assert.equal(two.maxGuests, 30);
    assert.equal(two.maxTents, 2);
    const three = stayLimits(dates, "2026-12-10", 3, "overnight", settings);
    assert.equal(three.maxGuests, 5);
    assert.equal(three.maxTents, 0);
  });

  it("caps tents at the stock", () => {
    const dates = [day("2026-12-10", { tentsLeft: 50 })];
    assert.equal(stayLimits(dates, "2026-12-10", 1, "overnight", settings).maxTents, settings.tentStock);
  });

  it("returns nothing for a check-in the data does not cover", () => {
    const limits = stayLimits([day("2026-12-10")], "2026-12-20", 1, "overnight", settings);
    assert.equal(limits.maxNights, 0);
    assert.equal(limits.maxGuests, 0);
  });

  it("handles a day tour: one date, no tents, no nights", () => {
    const dates = [day("2026-12-10", { guestsLeft: 42 }), day("2026-12-11", { state: "full", guestsLeft: 0 })];
    assert.deepEqual(stayLimits(dates, "2026-12-10", 0, "day_tour", settings), {
      maxNights: 0,
      maxGuests: 42,
      maxTents: 0,
    });
    assert.equal(stayLimits(dates, "2026-12-11", 0, "day_tour", settings).maxGuests, 0);
  });
});

describe("calendar helpers", () => {
  it("lays out December 2026 starting on a Tuesday", () => {
    const weeks = monthWeeks("2026-12");
    assert.equal(weeks.length, 5);
    assert.deepEqual(weeks[0].slice(0, 3), [null, null, "2026-12-01"]);
    assert.equal(weeks[4][4], "2026-12-31");
    assert.ok(weeks.every((week) => week.length === 7));
  });

  it("handles a leap-year February that fits in four rows", () => {
    const weeks = monthWeeks("2028-02");
    assert.equal(weeks.flat().filter(Boolean).length, 29);
    const feb2026 = monthWeeks("2026-02");
    assert.equal(feb2026.length, 4);
    assert.equal(feb2026[0][0], "2026-02-01");
  });

  it("shifts months across a year boundary", () => {
    assert.equal(shiftMonth("2026-12", 1), "2027-01");
    assert.equal(shiftMonth("2026-01", -1), "2025-12");
    assert.equal(shiftMonth("2026-05", 0), "2026-05");
  });

  it("formats days in UTC so the weekday never drifts", () => {
    assert.equal(formatDay("2026-12-12"), "Sat, Dec 12");
    assert.equal(formatDay("2026-01-01"), "Thu, Jan 1");
  });

  it("labels a slot with its camp", () => {
    assert.equal(slotLabel("Camp 1", "B"), "Camp 1 Slot B");
  });
});

describe("parseSelection", () => {
  const settings = DEFAULT_SETTINGS;

  it("restores a full overnight selection from the URL", () => {
    assert.deepEqual(
      parseSelection({ type: "overnight", in: "2026-12-12", n: "2", slots: "4,5" }, TODAY, settings),
      { kind: "overnight", checkIn: "2026-12-12", nights: 2, slotIds: [4, 5] },
    );
  });

  it("drops a date that is today, past, or beyond the window", () => {
    for (const date of [TODAY, "2026-11-01", "2027-02-18"]) {
      assert.equal(parseSelection({ type: "overnight", in: date }, TODAY, settings).checkIn, null);
    }
    assert.equal(parseSelection({ type: "overnight", in: "2027-02-17" }, TODAY, settings).checkIn, "2027-02-17");
  });

  it("falls back to one night when the stay is invalid", () => {
    assert.equal(parseSelection({ type: "overnight", in: "2026-12-12", n: "9" }, TODAY, settings).nights, 1);
    assert.equal(parseSelection({ type: "overnight", in: "2026-12-12", n: "abc" }, TODAY, settings).nights, 1);
    assert.equal(parseSelection({ type: "overnight", in: "2027-02-17", n: "2" }, TODAY, settings).nights, 1);
  });

  it("ignores slots for a day tour and bad slot lists", () => {
    assert.deepEqual(parseSelection({ type: "day_tour", in: "2026-12-12", slots: "4" }, TODAY, settings).slotIds, []);
    assert.deepEqual(
      parseSelection({ type: "overnight", in: "2026-12-12", slots: "4,x,4,-2,0,7" }, TODAY, settings).slotIds,
      [4, 7],
    );
  });

  it("ignores an unknown type and takes the first of repeated params", () => {
    assert.equal(parseSelection({ type: "glamping", in: "2026-12-12" }, TODAY, settings).kind, null);
    assert.equal(parseSelection({ type: ["day_tour", "overnight"] }, TODAY, settings).kind, "day_tour");
  });
});

describe("selectionQuery and visibleSteps", () => {
  it("round-trips through parseSelection", () => {
    const selection = { kind: "overnight" as const, checkIn: "2026-12-12", nights: 2, slotIds: [4, 5] };
    const query = selectionQuery(selection);
    assert.equal(query, "type=overnight&in=2026-12-12&n=2&slots=4,5");
    const params = Object.fromEntries(new URLSearchParams(query));
    assert.deepEqual(parseSelection(params, TODAY, DEFAULT_SETTINGS), selection);
  });

  it("leaves nights and slots out of a day tour", () => {
    assert.equal(
      selectionQuery({ kind: "day_tour", checkIn: "2026-12-12", nights: 3, slotIds: [1] }),
      "type=day_tour&in=2026-12-12",
    );
    assert.equal(selectionQuery({ kind: null, checkIn: null, nights: 1, slotIds: [] }), "");
  });

  it("hides the slots step for a day tour", () => {
    assert.ok(visibleSteps("overnight").includes("slots"));
    assert.ok(!visibleSteps("day_tour").includes("slots"));
  });
});
