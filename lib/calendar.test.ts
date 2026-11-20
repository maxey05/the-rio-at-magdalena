import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeCamps,
  bookingsBySlot,
  bookingTouchesRange,
  buildMonthCells,
  confirmKey,
  countDayTours,
  mondayWeeks,
  monthRange,
  parseDay,
  parseMonth,
  validateClosure,
  type CampRow,
  type DayBooking,
  type TouchingBooking,
} from "./calendar.ts";
import type { OccupancyRow } from "./stay.ts";

const NOW = new Date("2026-12-01T04:00:00Z");
const FUTURE = "2026-12-01T05:00:00Z";
const PAST = "2026-12-01T03:00:00Z";

function stay(overrides: Partial<TouchingBooking> = {}): TouchingBooking {
  return {
    kind: "overnight",
    check_in: "2026-12-10",
    check_out: "2026-12-12",
    status: "confirmed",
    hold_expires_at: null,
    ...overrides,
  };
}

function dayBooking(id: string, overrides: Partial<DayBooking> = {}): DayBooking {
  return { id, ref: `RIO-${id}`, guest_name: "Guest", guests: 2, status: "confirmed", hold_expires_at: null, ...overrides };
}

describe("parseDay and parseMonth", () => {
  it("accepts real dates only", () => {
    assert.equal(parseDay("2026-12-12"), "2026-12-12");
    assert.equal(parseDay("2026-02-30"), null);
    assert.equal(parseDay("2026-13-01"), null);
    assert.equal(parseDay("garbage"), null);
    assert.equal(parseDay("2026-12-1"), null);
    assert.equal(parseDay(undefined), null);
  });

  it("falls back to the month of today for a bad month", () => {
    assert.equal(parseMonth("2027-02", "2026-12-12"), "2027-02");
    assert.equal(parseMonth("2027-13", "2026-12-12"), "2026-12");
    assert.equal(parseMonth("0050-01", "2026-12-12"), "2026-12");
    assert.equal(parseMonth(undefined, "2026-12-12"), "2026-12");
  });
});

describe("monthRange and mondayWeeks", () => {
  it("finds the last day of the month, leap years included", () => {
    assert.deepEqual(monthRange("2026-12"), { first: "2026-12-01", last: "2026-12-31" });
    assert.deepEqual(monthRange("2028-02"), { first: "2028-02-01", last: "2028-02-29" });
    assert.deepEqual(monthRange("2027-02"), { first: "2027-02-01", last: "2027-02-28" });
  });

  it("starts weeks on Monday", () => {
    const weeks = mondayWeeks("2026-11");
    assert.deepEqual(weeks[0], [null, null, null, null, null, null, "2026-11-01"]);
    assert.equal(weeks[1][0], "2026-11-02");
    assert.equal(weeks[weeks.length - 1][0], "2026-11-30");
  });

  it("puts a Monday the 1st in the first column and pads the last week", () => {
    const weeks = mondayWeeks("2026-06");
    assert.equal(weeks[0][0], "2026-06-01");
    assert.equal(weeks.length, 5);
    assert.deepEqual(weeks[4].slice(2), [null, null, null, null, null]);
    assert.ok(weeks.every((week) => week.length === 7));
  });

  it("lists every date exactly once", () => {
    const dates = mondayWeeks("2026-12").flat().filter((cell) => cell !== null);
    assert.equal(dates.length, 31);
    assert.equal(new Set(dates).size, 31);
  });
});

describe("validateClosure", () => {
  const good = { start: "2026-12-12", end: "2026-12-14", reason: "  High river  " };

  it("trims and accepts a valid closure, including a single day", () => {
    assert.deepEqual(validateClosure(good), { ok: true, value: { start: "2026-12-12", end: "2026-12-14", reason: "High river" } });
    assert.equal(validateClosure({ ...good, end: "2026-12-12" }).ok, true);
  });

  it("rejects bad or impossible dates", () => {
    const result = validateClosure({ ...good, start: "2026-02-30", end: "" });
    assert.deepEqual(result.ok ? null : Object.keys(result.errors).sort(), ["end", "start"]);
  });

  it("rejects an end before the start", () => {
    const result = validateClosure({ ...good, end: "2026-12-11" });
    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.errors.end, /before the start/);
  });

  it("enforces the reason length after trimming", () => {
    assert.equal(validateClosure({ ...good, reason: "  ab  " }).ok, false);
    assert.equal(validateClosure({ ...good, reason: "abc" }).ok, true);
    assert.equal(validateClosure({ ...good, reason: "x".repeat(200) }).ok, true);
    assert.equal(validateClosure({ ...good, reason: "x".repeat(201) }).ok, false);
    assert.equal(validateClosure({ ...good, reason: "   " }).ok, false);
  });
});

describe("bookingTouchesRange", () => {
  it("touches when a night of the stay is inside the range", () => {
    assert.equal(bookingTouchesRange(stay(), "2026-12-10", "2026-12-10", NOW), true);
    assert.equal(bookingTouchesRange(stay(), "2026-12-11", "2026-12-20", NOW), true);
    assert.equal(bookingTouchesRange(stay(), "2026-12-01", "2026-12-10", NOW), true);
    assert.equal(bookingTouchesRange(stay(), "2026-12-01", "2026-12-31", NOW), true);
  });

  it("does not touch a stay on its check-out date (D-095)", () => {
    assert.equal(bookingTouchesRange(stay(), "2026-12-12", "2026-12-14", NOW), false);
  });

  it("does not touch a range that ends the day before check-in", () => {
    assert.equal(bookingTouchesRange(stay(), "2026-12-01", "2026-12-09", NOW), false);
  });

  it("touches a day tour only on its own date", () => {
    const tour = stay({ kind: "day_tour", check_in: "2026-12-10", check_out: "2026-12-10" });
    assert.equal(bookingTouchesRange(tour, "2026-12-10", "2026-12-10", NOW), true);
    assert.equal(bookingTouchesRange(tour, "2026-12-08", "2026-12-12", NOW), true);
    assert.equal(bookingTouchesRange(tour, "2026-12-11", "2026-12-12", NOW), false);
    assert.equal(bookingTouchesRange(tour, "2026-12-01", "2026-12-09", NOW), false);
  });

  it("counts payment_review, confirmed and checked_in", () => {
    for (const status of ["payment_review", "confirmed", "checked_in"] as const) {
      assert.equal(bookingTouchesRange(stay({ status }), "2026-12-10", "2026-12-10", NOW), true, status);
    }
  });

  it("counts awaiting_payment only while the hold is open", () => {
    assert.equal(bookingTouchesRange(stay({ status: "awaiting_payment", hold_expires_at: FUTURE }), "2026-12-10", "2026-12-10", NOW), true);
    assert.equal(bookingTouchesRange(stay({ status: "awaiting_payment", hold_expires_at: PAST }), "2026-12-10", "2026-12-10", NOW), false);
    assert.equal(bookingTouchesRange(stay({ status: "awaiting_payment", hold_expires_at: null }), "2026-12-10", "2026-12-10", NOW), false);
  });

  it("ignores finished and released bookings", () => {
    for (const status of ["completed", "expired", "rejected", "cancelled", "no_show"] as const) {
      assert.equal(bookingTouchesRange(stay({ status }), "2026-12-10", "2026-12-10", NOW), false, status);
    }
  });
});

describe("confirmKey", () => {
  it("is the same for the same range and bookings in any order", () => {
    assert.equal(confirmKey("2026-12-10", "2026-12-12", [{ id: "b" }, { id: "a" }]), confirmKey("2026-12-10", "2026-12-12", [{ id: "a" }, { id: "b" }]));
  });

  it("changes when the range or the bookings change", () => {
    const base = confirmKey("2026-12-10", "2026-12-12", [{ id: "a" }]);
    assert.notEqual(base, confirmKey("2026-12-10", "2026-12-13", [{ id: "a" }]));
    assert.notEqual(base, confirmKey("2026-12-09", "2026-12-12", [{ id: "a" }]));
    assert.notEqual(base, confirmKey("2026-12-10", "2026-12-12", [{ id: "a" }, { id: "b" }]));
  });
});

describe("countDayTours", () => {
  it("counts active day tours per date and skips stale holds", () => {
    const counts = countDayTours(
      [
        { check_in: "2026-12-10", status: "confirmed", hold_expires_at: null },
        { check_in: "2026-12-10", status: "payment_review", hold_expires_at: null },
        { check_in: "2026-12-10", status: "awaiting_payment", hold_expires_at: PAST },
        { check_in: "2026-12-10", status: "awaiting_payment", hold_expires_at: FUTURE },
        { check_in: "2026-12-11", status: "cancelled", hold_expires_at: null },
        { check_in: "2026-12-12", status: "checked_in", hold_expires_at: null },
      ],
      NOW,
    );
    assert.deepEqual(counts, { "2026-12-10": 3, "2026-12-12": 1 });
  });
});

describe("buildMonthCells", () => {
  const rows: OccupancyRow[] = [
    { d: "2026-12-10", guests: 40, slots_taken: 4, tents: 0, closed: false },
    { d: "2026-12-11", guests: 10, slots_taken: 12, tents: 0, closed: true },
    { d: "2026-12-12", guests: 0, slots_taken: 0, tents: 0, closed: false },
  ];

  it("derives free slots from the total, never a fixed 16", () => {
    const cells = buildMonthCells(rows, { "2026-12-10": 2 }, 12, 100);
    assert.deepEqual(
      cells.map((cell) => [cell.slotsTaken, cell.slotsTotal, cell.slotsFree, cell.dayTours]),
      [
        [4, 12, 8, 2],
        [12, 12, 0, 0],
        [0, 12, 12, 0],
      ],
    );
  });

  it("carries guests, site cap and closed flag", () => {
    const cells = buildMonthCells(rows, {}, 16, 100);
    assert.equal(cells[0].guests, 40);
    assert.equal(cells[0].siteCap, 100);
    assert.equal(cells[1].closed, true);
    assert.equal(cells[2].closed, false);
  });

  it("fills the bar by the fuller of guests and slots", () => {
    const cells = buildMonthCells(rows, {}, 16, 100);
    assert.deepEqual(cells.map((cell) => cell.fillPercent), [40, 75, 0]);
  });

  it("never overfills, never divides by zero", () => {
    const over = buildMonthCells([{ d: "2026-12-10", guests: 300, slots_taken: 30, tents: 0, closed: false }], {}, 16, 100);
    assert.equal(over[0].fillPercent, 100);
    assert.equal(over[0].slotsFree, 0);
    const empty = buildMonthCells([{ d: "2026-12-10", guests: 5, slots_taken: 1, tents: 0, closed: false }], {}, 0, 0);
    assert.equal(empty[0].fillPercent, 0);
  });
});

describe("activeCamps", () => {
  it("orders camps and slots and drops inactive slots", () => {
    const rows: CampRow[] = [
      { id: 2, name: "Camp 2", sort: 2, slots: [{ id: 11, code: "K", sort: 2, active: true }, { id: 10, code: "J", sort: 1, active: true }] },
      { id: 1, name: "Camp 1", sort: 1, slots: [{ id: 2, code: "B", sort: 2, active: false }, { id: 1, code: "A", sort: 1, active: true }] },
    ];
    assert.deepEqual(activeCamps(rows), [
      { id: 1, name: "Camp 1", slots: [{ id: 1, code: "A" }] },
      { id: 2, name: "Camp 2", slots: [{ id: 10, code: "J" }, { id: 11, code: "K" }] },
    ]);
  });
});

describe("bookingsBySlot", () => {
  it("maps each slot to the active booking holding that night", () => {
    const map = bookingsBySlot(
      [
        { slot_id: 1, bookings: dayBooking("a") },
        { slot_id: 2, bookings: dayBooking("b", { status: "awaiting_payment", hold_expires_at: FUTURE }) },
        { slot_id: 3, bookings: dayBooking("c", { status: "awaiting_payment", hold_expires_at: PAST }) },
        { slot_id: 4, bookings: dayBooking("d", { status: "cancelled" }) },
        { slot_id: 5, bookings: null },
      ],
      NOW,
    );
    assert.deepEqual([...map.keys()], [1, 2]);
    assert.equal(map.get(1)?.ref, "RIO-a");
  });
});
