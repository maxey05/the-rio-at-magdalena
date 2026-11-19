import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS, addDays, formatPeso, manilaNow, manilaToday } from "./rules.ts";

describe("manilaToday", () => {
  it("rolls to the next Manila day after 16:00 UTC", () => {
    assert.equal(manilaToday(new Date("2026-11-19T16:30:00Z")), "2026-11-20");
  });

  it("stays on the same Manila day before 16:00 UTC", () => {
    assert.equal(manilaToday(new Date("2026-11-19T15:59:00Z")), "2026-11-19");
  });

  it("switches exactly at Manila midnight", () => {
    assert.equal(manilaToday(new Date("2026-11-19T15:59:59.999Z")), "2026-11-19");
    assert.equal(manilaToday(new Date("2026-11-19T16:00:00.000Z")), "2026-11-20");
  });

  it("rolls over the new year in Manila time", () => {
    assert.equal(manilaToday(new Date("2026-12-31T16:00:00Z")), "2027-01-01");
  });

  it("returns a YYYY-MM-DD string when called without arguments", () => {
    assert.match(manilaToday(), /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("manilaNow", () => {
  it("returns Manila clock parts", () => {
    assert.deepEqual(manilaNow(new Date("2026-11-19T16:30:05Z")), {
      year: 2026,
      month: 11,
      day: 20,
      hour: 0,
      minute: 30,
      second: 5,
    });
  });

  it("reports hour 0 at Manila midnight, never 24", () => {
    assert.equal(manilaNow(new Date("2026-11-19T16:00:00Z")).hour, 0);
  });

  it("reports hour 23 one minute before Manila midnight", () => {
    const parts = manilaNow(new Date("2026-11-19T15:59:00Z"));
    assert.equal(parts.hour, 23);
    assert.equal(parts.minute, 59);
  });
});

describe("addDays", () => {
  it("adds days inside a month", () => {
    assert.equal(addDays("2026-11-19", 3), "2026-11-22");
  });

  it("crosses a month end", () => {
    assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  });

  it("crosses a year end", () => {
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  });

  it("handles leap years", () => {
    assert.equal(addDays("2028-02-28", 1), "2028-02-29");
    assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  });

  it("returns the same date for zero days", () => {
    assert.equal(addDays("2026-11-19", 0), "2026-11-19");
  });

  it("subtracts days with a negative number", () => {
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
    assert.equal(addDays("2027-01-01", -1), "2026-12-31");
  });

  it("lands on the 90 day booking window boundary", () => {
    assert.equal(addDays("2026-11-19", 90), "2027-02-17");
  });

  it("rejects text that is not a date", () => {
    assert.throws(() => addDays("not-a-date", 1), RangeError);
  });

  it("rejects dates that do not exist", () => {
    assert.throws(() => addDays("2026-02-30", 1), RangeError);
    assert.throws(() => addDays("2026-13-01", 1), RangeError);
  });
});

describe("formatPeso", () => {
  it("formats pesos with a thousands separator", () => {
    assert.equal(formatPeso(1250), "₱1,250");
  });

  it("formats zero", () => {
    assert.equal(formatPeso(0), "₱0");
  });

  it("formats amounts under one thousand", () => {
    assert.equal(formatPeso(500), "₱500");
  });

  it("formats millions", () => {
    assert.equal(formatPeso(1234567), "₱1,234,567");
  });

  it("puts the minus sign before the peso sign", () => {
    assert.equal(formatPeso(-350), "-₱350");
  });
});

describe("DEFAULT_SETTINGS", () => {
  it("holds the overnight rates from the owner", () => {
    assert.equal(DEFAULT_SETTINGS.overnightAdult, 500);
    assert.equal(DEFAULT_SETTINGS.overnightReduced, 350);
  });

  it("holds the day tour rates from the owner", () => {
    assert.equal(DEFAULT_SETTINGS.dayAdult, 300);
    assert.equal(DEFAULT_SETTINGS.dayReduced, 200);
  });

  it("holds the tent price and default stock", () => {
    assert.equal(DEFAULT_SETTINGS.tentPrice, 500);
    assert.equal(DEFAULT_SETTINGS.tentStock, 5);
  });

  it("holds the capacity limits", () => {
    assert.equal(DEFAULT_SETTINGS.slotCapacity, 10);
    assert.equal(DEFAULT_SETTINGS.siteCap, 100);
  });

  it("holds the booking window rules", () => {
    assert.equal(DEFAULT_SETTINGS.windowDays, 90);
    assert.equal(DEFAULT_SETTINGS.maxNights, 7);
    assert.equal(DEFAULT_SETTINGS.holdMinutes, 30);
  });

  it("holds the downpayment percentage", () => {
    assert.equal(DEFAULT_SETTINGS.downpaymentPct, 50);
  });

  it("has exactly the twelve expected keys", () => {
    assert.deepEqual(Object.keys(DEFAULT_SETTINGS).sort(), [
      "dayAdult",
      "dayReduced",
      "downpaymentPct",
      "holdMinutes",
      "maxNights",
      "overnightAdult",
      "overnightReduced",
      "siteCap",
      "slotCapacity",
      "tentPrice",
      "tentStock",
      "windowDays",
    ]);
  });

  it("only contains whole pesos and counts", () => {
    for (const value of Object.values(DEFAULT_SETTINGS)) {
      assert.ok(Number.isInteger(value));
    }
  });
});
