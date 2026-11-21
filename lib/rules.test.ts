import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  DEFAULT_SETTINGS,
  STATUSES,
  addDays,
  bookingWindow,
  canMarkNoShow,
  checkSlotCapacity,
  formatPeso,
  guestCount,
  heldNights,
  isBookableDate,
  isGuestCancellable,
  manilaNow,
  manilaToday,
  newAccessToken,
  newRef,
  normalizeNewlines,
  normalizeGcashRef,
  normalizeMobile,
  parsePesos,
  priceBooking,
  stayNights,
  statusLabel,
  validateDetails,
  validateInquiry,
  validateReason,
  validateStay,
  INQUIRY_TYPES,
  type DetailsForm,
  type InquiryForm,
} from "./rules.ts";

const TODAY = "2026-11-19";

describe("bookingWindow and isBookableDate", () => {
  it("opens tomorrow and closes 90 days out", () => {
    assert.deepEqual(bookingWindow(TODAY, DEFAULT_SETTINGS), { first: "2026-11-20", last: "2027-02-17" });
  });

  it("does not allow today", () => {
    assert.equal(isBookableDate(TODAY, TODAY, DEFAULT_SETTINGS), false);
  });

  it("allows the first and last day, not the day after", () => {
    assert.equal(isBookableDate("2026-11-20", TODAY, DEFAULT_SETTINGS), true);
    assert.equal(isBookableDate("2027-02-17", TODAY, DEFAULT_SETTINGS), true);
    assert.equal(isBookableDate("2027-02-18", TODAY, DEFAULT_SETTINGS), false);
  });

  it("rejects past and malformed dates without throwing", () => {
    assert.equal(isBookableDate("2026-11-01", TODAY, DEFAULT_SETTINGS), false);
    assert.equal(isBookableDate("nope", TODAY, DEFAULT_SETTINGS), false);
    assert.equal(isBookableDate("2026-02-30", TODAY, DEFAULT_SETTINGS), false);
  });

  it("works across the year boundary", () => {
    assert.deepEqual(bookingWindow("2026-12-31", DEFAULT_SETTINGS), { first: "2027-01-01", last: "2027-03-31" });
  });

  it("follows the windowDays setting", () => {
    const settings = { ...DEFAULT_SETTINGS, windowDays: 30 };
    assert.equal(bookingWindow(TODAY, settings).last, "2026-12-19");
  });
});

describe("stayNights", () => {
  it("lists each night", () => {
    assert.deepEqual(stayNights("2026-11-20", 3), ["2026-11-20", "2026-11-21", "2026-11-22"]);
  });

  it("crosses Dec 31 into Jan 1", () => {
    assert.deepEqual(stayNights("2026-12-31", 2), ["2026-12-31", "2027-01-01"]);
  });

  it("includes Feb 29 in a leap year", () => {
    assert.deepEqual(stayNights("2028-02-28", 3), ["2028-02-28", "2028-02-29", "2028-03-01"]);
  });

  it("returns nothing for zero nights and rejects bad counts", () => {
    assert.deepEqual(stayNights("2026-11-20", 0), []);
    assert.throws(() => stayNights("2026-11-20", -1), RangeError);
    assert.throws(() => stayNights("2026-11-20", 1.5), RangeError);
  });
});

describe("heldNights", () => {
  it("holds each night of an overnight stay", () => {
    assert.deepEqual(heldNights("overnight", "2026-11-20", 2), ["2026-11-20", "2026-11-21"]);
  });

  it("holds only the tour date for a day tour", () => {
    assert.deepEqual(heldNights("day_tour", "2026-11-20", 0), ["2026-11-20"]);
  });
});

describe("validateStay", () => {
  const overnight = (checkIn: string, nights: number) => ({ kind: "overnight" as const, checkIn, nights });

  it("accepts 1 and 30 nights", () => {
    assert.equal(validateStay(overnight("2026-11-20", 1), TODAY, DEFAULT_SETTINGS).ok, true);
    assert.equal(validateStay(overnight("2026-11-20", 30), TODAY, DEFAULT_SETTINGS).ok, true);
  });

  it("rejects 0 and 31 nights", () => {
    const zero = validateStay(overnight("2026-11-20", 0), TODAY, DEFAULT_SETTINGS);
    const tooLong = validateStay(overnight("2026-11-20", 31), TODAY, DEFAULT_SETTINGS);
    assert.equal(zero.ok, false);
    assert.equal(tooLong.ok, false);
    assert.ok(tooLong.errors.nights);
  });

  it("rejects fractional nights", () => {
    assert.equal(validateStay(overnight("2026-11-20", 1.5), TODAY, DEFAULT_SETTINGS).ok, false);
  });

  it("rejects a check-in outside the window", () => {
    const result = validateStay(overnight(TODAY, 1), TODAY, DEFAULT_SETTINGS);
    assert.equal(result.ok, false);
    assert.ok(result.errors.checkIn);
    assert.equal(validateStay(overnight("2027-02-18", 1), TODAY, DEFAULT_SETTINGS).ok, false);
  });

  it("rejects a stay whose last night is past the window", () => {
    assert.equal(validateStay(overnight("2027-02-17", 1), TODAY, DEFAULT_SETTINGS).ok, true);
    const result = validateStay(overnight("2027-02-17", 2), TODAY, DEFAULT_SETTINGS);
    assert.equal(result.ok, false);
    assert.ok(result.errors.nights);
  });

  it("rejects a malformed check-in without throwing", () => {
    assert.equal(validateStay(overnight("2026-13-01", 1), TODAY, DEFAULT_SETTINGS).ok, false);
  });

  it("checks only the date for a day tour", () => {
    assert.equal(validateStay({ kind: "day_tour", checkIn: "2026-11-20", nights: 0 }, TODAY, DEFAULT_SETTINGS).ok, true);
    assert.equal(validateStay({ kind: "day_tour", checkIn: TODAY, nights: 1 }, TODAY, DEFAULT_SETTINGS).ok, false);
    assert.equal(validateStay({ kind: "day_tour", checkIn: "2027-02-18", nights: 1 }, TODAY, DEFAULT_SETTINGS).ok, false);
  });
});

describe("guestCount", () => {
  it("counts infants", () => {
    assert.equal(guestCount({ adults: 2, seniors: 1, kids: 1, infants: 1 }), 5);
  });
});

describe("priceBooking", () => {
  const single = { kind: "overnight" as const, adults: 1, seniors: 0, kids: 0, infants: 0, nights: 1, tents: 0 };

  it("prices the mixed overnight example", () => {
    const quote = priceBooking(
      { kind: "overnight", adults: 2, seniors: 1, kids: 1, infants: 1, nights: 2, tents: 1 },
      DEFAULT_SETTINGS,
    );
    assert.equal(quote.total, 4400);
    assert.equal(quote.downpayment, 2200);
    assert.equal(quote.balance, 2200);
    assert.equal(quote.adultRate, 500);
    assert.equal(quote.reducedRate, 350);
    assert.equal(quote.tentRate, 500);
    assert.equal(quote.lines.reduce((sum, line) => sum + line.amount, 0), 4400);
  });

  it("prices 16 adults for one night", () => {
    const quote = priceBooking({ ...single, adults: 16 }, DEFAULT_SETTINGS);
    assert.equal(quote.total, 8000);
    assert.equal(quote.downpayment, 4000);
  });

  it("prices a day tour once and ignores nights", () => {
    const quote = priceBooking(
      { kind: "day_tour", adults: 4, seniors: 0, kids: 2, infants: 0, nights: 3, tents: 0 },
      DEFAULT_SETTINGS,
    );
    assert.equal(quote.total, 1600);
    assert.equal(quote.downpayment, 800);
    assert.equal(quote.adultRate, 300);
    assert.equal(quote.reducedRate, 200);
    assert.ok(quote.lines.every((line) => !line.label.startsWith("Tents")));
  });

  it("charges a day tour tent once at the tent price", () => {
    const quote = priceBooking(
      { kind: "day_tour", adults: 4, seniors: 0, kids: 2, infants: 0, nights: 3, tents: 2 },
      DEFAULT_SETTINGS,
    );
    assert.equal(quote.tentRate, 500);
    assert.equal(quote.total, 2600);
    assert.equal(quote.downpayment, 1300);
    const tents = quote.lines.find((line) => line.label.startsWith("Tents"));
    assert.deepEqual(tents && [tents.label, tents.quantity, tents.unitPrice, tents.amount], ["Tents", 2, 500, 1000]);
  });

  it("charges infants nothing", () => {
    const quote = priceBooking({ ...single, adults: 0, infants: 4 }, DEFAULT_SETTINGS);
    assert.equal(quote.total, 0);
    assert.equal(quote.downpayment, 0);
    assert.deepEqual(quote.lines, []);
  });

  it("rounds an odd downpayment up", () => {
    const odd = priceBooking(single, { ...DEFAULT_SETTINGS, overnightAdult: 850 });
    assert.equal(odd.total, 850);
    assert.equal(odd.downpayment, 425);
    const ceil = priceBooking(single, { ...DEFAULT_SETTINGS, overnightAdult: 875 });
    assert.equal(ceil.total, 875);
    assert.equal(ceil.downpayment, 438);
    assert.equal(ceil.balance, 437);
  });

  it("follows the settings table", () => {
    const settings = { ...DEFAULT_SETTINGS, overnightAdult: 600, tentPrice: 700, downpaymentPct: 30 };
    const quote = priceBooking({ ...single, nights: 2, tents: 1 }, settings);
    assert.equal(quote.total, 2600);
    assert.equal(quote.downpayment, 780);
  });

  it("keeps downpayment plus balance equal to the total", () => {
    for (let adults = 1; adults <= 20; adults += 1) {
      const quote = priceBooking({ ...single, adults, seniors: 1, kids: 1, nights: 3, tents: 1 }, DEFAULT_SETTINGS);
      assert.equal(quote.downpayment + quote.balance, quote.total);
    }
  });
});

describe("checkSlotCapacity", () => {
  it("fails 11 guests in 1 slot and asks for 2", () => {
    assert.deepEqual(checkSlotCapacity(11, 1, DEFAULT_SETTINGS), { ok: false, neededSlots: 2 });
  });

  it("passes 10 guests in 1 slot and 20 in 2", () => {
    assert.equal(checkSlotCapacity(10, 1, DEFAULT_SETTINGS).ok, true);
    assert.equal(checkSlotCapacity(20, 2, DEFAULT_SETTINGS).ok, true);
  });

  it("fails with zero slots", () => {
    const result = checkSlotCapacity(3, 0, DEFAULT_SETTINGS);
    assert.equal(result.ok, false);
    assert.equal(result.neededSlots, 1);
  });

  it("counts infants when the caller passes guestCount", () => {
    const total = guestCount({ adults: 8, seniors: 1, kids: 0, infants: 2 });
    assert.equal(checkSlotCapacity(total, 1, DEFAULT_SETTINGS).ok, false);
  });
});

describe("normalizeMobile", () => {
  it("converts a local number", () => {
    assert.equal(normalizeMobile("0917-123 4567"), "+639171234567");
  });

  it("keeps an international number", () => {
    assert.equal(normalizeMobile("+639171234567"), "+639171234567");
  });

  it("rejects bad input", () => {
    for (const raw of ["12345", "", "09171234", "0817 123 4567", "+449171234567", "0917abc4567"]) {
      assert.equal(normalizeMobile(raw), null, raw);
    }
  });
});

describe("normalizeGcashRef", () => {
  it("strips spaces to 13 digits", () => {
    assert.equal(normalizeGcashRef("1009 876 543210"), "1009876543210");
  });

  it("rejects 12 and 14 digits and letters", () => {
    for (const raw of ["100987654321", "10098765432101", "10098765432AB", ""]) {
      assert.equal(normalizeGcashRef(raw), null, raw);
    }
  });
});

describe("newRef", () => {
  const shape = /^RIO-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

  it("uses only the allowed alphabet and is 10 characters", () => {
    const ref = newRef(Uint8Array.from({ length: 32 }, (_, index) => index * 8));
    assert.equal(ref.length, 10);
    assert.match(ref, shape);
  });

  it("is deterministic for fixed bytes", () => {
    const bytes = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]);
    assert.equal(newRef(bytes), "RIO-ABCDEF");
    assert.equal(newRef(bytes), newRef(bytes));
  });

  it("never emits look-alike characters for any byte value", () => {
    for (let byte = 0; byte < 248; byte += 1) {
      const ref = newRef(new Uint8Array(6).fill(byte));
      assert.match(ref, shape);
      assert.doesNotMatch(ref.slice(4), /[01OIL]/);
    }
  });

  it("skips biased bytes and throws when too few usable bytes remain", () => {
    assert.equal(newRef(Uint8Array.from([255, 250, 0, 1, 2, 3, 4, 5])), "RIO-ABCDEF");
    assert.throws(() => newRef(Uint8Array.from([255, 255, 255, 255, 255, 255])), RangeError);
    assert.throws(() => newRef(Uint8Array.from([1, 2, 3])), RangeError);
  });
});

describe("newAccessToken", () => {
  it("encodes 32 bytes as 43 url-safe characters", () => {
    const token = newAccessToken(new Uint8Array(32).fill(255));
    assert.equal(token.length, 43);
    assert.equal(token, `${"_".repeat(42)}8`);
  });

  it("matches Node's base64url", () => {
    const bytes = Uint8Array.from({ length: 32 }, (_, index) => (index * 37 + 11) % 256);
    const token = newAccessToken(bytes);
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(token, Buffer.from(bytes).toString("base64url"));
  });

  it("is deterministic and rejects the wrong length", () => {
    const bytes = new Uint8Array(32).fill(7);
    assert.equal(newAccessToken(bytes), newAccessToken(bytes));
    assert.throws(() => newAccessToken(new Uint8Array(31)), RangeError);
    assert.throws(() => newAccessToken(new Uint8Array(33)), RangeError);
  });
});

describe("statusLabel", () => {
  it("labels all nine statuses", () => {
    assert.equal(STATUSES.length, 9);
    assert.deepEqual(STATUSES.map(statusLabel), [
      "Awaiting payment",
      "Payment review",
      "Confirmed",
      "Checked in",
      "Completed",
      "Expired",
      "Rejected",
      "Cancelled",
      "No-show",
    ]);
  });
});

describe("isGuestCancellable", () => {
  it("is false on check-in day and true the day before", () => {
    assert.equal(isGuestCancellable({ status: "confirmed", checkIn: "2026-11-20" }, "2026-11-20"), false);
    assert.equal(isGuestCancellable({ status: "confirmed", checkIn: "2026-11-20" }, "2026-11-19"), true);
  });

  it("is false after check-in day", () => {
    assert.equal(isGuestCancellable({ status: "confirmed", checkIn: "2026-11-20" }, "2026-11-21"), false);
  });

  it("is true for the three live statuses", () => {
    for (const status of ["awaiting_payment", "payment_review", "confirmed"] as const) {
      assert.equal(isGuestCancellable({ status, checkIn: "2026-11-25" }, "2026-11-19"), true);
    }
  });

  it("is false for every other status", () => {
    for (const status of ["checked_in", "completed", "expired", "rejected", "cancelled", "no_show"] as const) {
      assert.equal(isGuestCancellable({ status, checkIn: "2026-11-25" }, "2026-11-19"), false);
    }
  });

  it("compares correctly across a year boundary", () => {
    assert.equal(isGuestCancellable({ status: "confirmed", checkIn: "2027-01-01" }, "2026-12-31"), true);
  });
});

describe("validateDetails", () => {
  const good: DetailsForm = {
    name: "  Juan Dela Cruz ",
    email: " Juan@Example.COM ",
    mobile: "0917-123 4567",
    notes: " bringing a dog ",
    agreeRules: true,
    agreePrivacy: true,
  };

  it("accepts and normalizes a good form", () => {
    const result = validateDetails(good);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.values, {
        name: "Juan Dela Cruz",
        email: "juan@example.com",
        mobile: "+639171234567",
        notes: "bringing a dog",
      });
    }
  });

  it("allows empty notes", () => {
    assert.equal(validateDetails({ ...good, notes: "" }).ok, true);
  });

  it("checks name length 2 to 80", () => {
    assert.equal(validateDetails({ ...good, name: "J" }).ok, false);
    assert.equal(validateDetails({ ...good, name: "Jo" }).ok, true);
    assert.equal(validateDetails({ ...good, name: "a".repeat(80) }).ok, true);
    const long = validateDetails({ ...good, name: "a".repeat(81) });
    assert.equal(long.ok, false);
    assert.ok(long.errors.name);
  });

  it("rejects bad emails", () => {
    for (const email of ["", "juan", "juan@", "@example.com", "juan@example", "ju an@example.com", "a@b..com"]) {
      const result = validateDetails({ ...good, email });
      assert.equal(result.ok, false, email);
      assert.ok(result.errors.email, email);
    }
  });

  it("rejects a bad mobile", () => {
    const result = validateDetails({ ...good, mobile: "12345" });
    assert.equal(result.ok, false);
    assert.ok(result.errors.mobile);
  });

  it("checks notes length 500", () => {
    assert.equal(validateDetails({ ...good, notes: "n".repeat(500) }).ok, true);
    const long = validateDetails({ ...good, notes: "n".repeat(501) });
    assert.equal(long.ok, false);
    assert.ok(long.errors.notes);
  });

  it("requires both consents", () => {
    const rules = validateDetails({ ...good, agreeRules: false });
    const privacy = validateDetails({ ...good, agreePrivacy: false });
    assert.equal(rules.ok, false);
    assert.equal(privacy.ok, false);
    assert.ok(rules.errors.agreeRules);
    assert.ok(privacy.errors.agreePrivacy);
  });

  it("reports every error at once", () => {
    const result = validateDetails({ name: "", email: "", mobile: "", notes: "", agreeRules: false, agreePrivacy: false });
    assert.deepEqual(Object.keys(result.errors).sort(), ["agreePrivacy", "agreeRules", "email", "mobile", "name"]);
  });
});

describe("rules.ts purity", () => {
  it("imports nothing from Next, Supabase or Node", () => {
    const source = readFileSync(new URL("./rules.ts", import.meta.url), "utf8");
    assert.doesNotMatch(source, /^\s*import\s/m);
    assert.doesNotMatch(source, /require\(/);
    assert.doesNotMatch(source, /from "(next|node:|@supabase)/);
  });
});

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
    assert.equal(DEFAULT_SETTINGS.maxNights, 30);
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

describe("validateReason", () => {
  it("rejects an empty reason", () => {
    assert.deepEqual(validateReason(""), { ok: false, error: "Give a reason of at least 10 characters." });
  });

  it("rejects 9 characters and accepts 10", () => {
    assert.equal(validateReason("a".repeat(9)).ok, false);
    assert.deepEqual(validateReason("a".repeat(10)), { ok: true, value: "a".repeat(10) });
  });

  it("accepts 300 characters and rejects 301", () => {
    assert.equal(validateReason("a".repeat(300)).ok, true);
    assert.deepEqual(validateReason("a".repeat(301)), { ok: false, error: "Keep the reason to 300 characters or fewer." });
  });

  it("trims surrounding whitespace before counting", () => {
    assert.equal(validateReason(`   ${"a".repeat(9)}   `).ok, false);
    assert.deepEqual(validateReason(`  ${"a".repeat(10)}
`), { ok: true, value: "a".repeat(10) });
    assert.equal(validateReason(`${" ".repeat(20)}`).ok, false);
  });
});

describe("parsePesos", () => {
  it("accepts whole pesos including zero and thousands commas", () => {
    assert.equal(parsePesos("0"), 0);
    assert.equal(parsePesos(" 1350 "), 1350);
    assert.equal(parsePesos("1,350"), 1350);
  });

  it("refuses empty, negative, decimal, text and huge values", () => {
    for (const raw of ["", " ", "-5", "12.5", "abc", "1e3", "12345678"]) {
      assert.equal(parsePesos(raw), null, raw);
    }
  });
});

describe("canMarkNoShow", () => {
  it("is false before the check-in date", () => {
    assert.equal(canMarkNoShow("2026-11-21", "2026-11-20"), false);
  });

  it("is true on and after the check-in date", () => {
    assert.equal(canMarkNoShow("2026-11-21", "2026-11-21"), true);
    assert.equal(canMarkNoShow("2026-11-21", "2026-11-22"), true);
  });
});

const validInquiry: InquiryForm = {
  name: "  Ana Reyes ",
  mobile: "0917 123 4567",
  email: " Ana@Example.COM ",
  type: "Prenup shoot",
  preferredDate: "2026-12-05",
  guests: "40",
  message: "  We would like to shoot at golden hour.  ",
  agreePrivacy: true,
  website: "",
};

function inquiryWith(changes: Partial<InquiryForm>) {
  return validateInquiry({ ...validInquiry, ...changes }, TODAY);
}

describe("validateInquiry", () => {
  it("accepts a valid inquiry and returns trimmed, normalized values", () => {
    const result = validateInquiry(validInquiry, TODAY);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.values, {
        name: "Ana Reyes",
        mobile: "+639171234567",
        email: "ana@example.com",
        type: "Prenup shoot",
        preferred_date: "2026-12-05",
        guests: 40,
        message: "We would like to shoot at golden hour.",
      });
    }
  });

  it("accepts all three types", () => {
    assert.deepEqual([...INQUIRY_TYPES], ["Intimate event", "Prenup shoot", "Other"]);
    for (const type of INQUIRY_TYPES) {
      assert.equal(inquiryWith({ type }).ok, true, type);
    }
  });

  it("rejects an unknown or empty type", () => {
    assert.ok(inquiryWith({ type: "Wedding" }).errors.type);
    assert.ok(inquiryWith({ type: "" }).errors.type);
  });

  it("reports every missing field at once", () => {
    const result = validateInquiry(
      { name: "", mobile: "", email: "", type: "", preferredDate: "", guests: "", message: "", agreePrivacy: false, website: "" },
      TODAY,
    );
    assert.equal(result.ok, false);
    assert.deepEqual(Object.keys(result.errors).sort(), ["agreePrivacy", "email", "guests", "message", "mobile", "name", "type"]);
  });

  it("makes the preferred date optional", () => {
    const result = inquiryWith({ preferredDate: "   " });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.values.preferred_date, null);
    }
  });

  it("accepts today as the preferred date and rejects yesterday", () => {
    assert.equal(inquiryWith({ preferredDate: TODAY }).ok, true);
    assert.ok(inquiryWith({ preferredDate: "2026-11-18" }).errors.preferredDate);
  });

  it("accepts a far-future preferred date", () => {
    assert.equal(inquiryWith({ preferredDate: "2030-01-01" }).ok, true);
  });

  it("rejects malformed and impossible dates", () => {
    for (const preferredDate of ["12/05/2026", "2026-13-01", "2027-02-30", "tomorrow", "2026-1-5"]) {
      assert.ok(inquiryWith({ preferredDate }).errors.preferredDate, preferredDate);
    }
  });

  it("limits guests to 1 through 300", () => {
    assert.equal(inquiryWith({ guests: "1" }).ok, true);
    assert.equal(inquiryWith({ guests: "300" }).ok, true);
    for (const guests of ["0", "301", "-5", "1.5", "ten", "", "1e2", "1000"]) {
      assert.ok(inquiryWith({ guests }).errors.guests, guests);
    }
  });

  it("limits the message to 10 through 1000 characters after trimming", () => {
    assert.equal(inquiryWith({ message: "x".repeat(10) }).ok, true);
    assert.equal(inquiryWith({ message: "x".repeat(1000) }).ok, true);
    assert.ok(inquiryWith({ message: "x".repeat(9) }).errors.message);
    assert.ok(inquiryWith({ message: "x".repeat(1001) }).errors.message);
    assert.ok(inquiryWith({ message: `   ${"x".repeat(9)}   ` }).errors.message);
  });

  it("requires the privacy consent", () => {
    assert.ok(inquiryWith({ agreePrivacy: false }).errors.agreePrivacy);
  });

  it("validates name, email and mobile like the booking flow", () => {
    assert.ok(inquiryWith({ name: "A" }).errors.name);
    assert.ok(inquiryWith({ name: "x".repeat(81) }).errors.name);
    assert.ok(inquiryWith({ email: "not-an-email" }).errors.email);
    assert.ok(inquiryWith({ mobile: "12345" }).errors.mobile);
    assert.equal(inquiryWith({ mobile: "+63 917 123 4567" }).ok, true);
  });

  it("treats a filled honeypot as spam with no field errors", () => {
    const result = inquiryWith({ website: "http://spam.example" });
    assert.deepEqual(result, { ok: false, errors: {}, spam: true });
  });

  it("treats a honeypot of only spaces as empty", () => {
    assert.equal(inquiryWith({ website: "   " }).ok, true);
  });

  it("flags spam even when other fields are invalid", () => {
    assert.deepEqual(inquiryWith({ website: "x", name: "", guests: "0" }), { ok: false, errors: {}, spam: true });
  });
});

describe("normalizeNewlines and inquiry messages", () => {
  it("turns CRLF and CR into LF", () => {
    assert.equal(normalizeNewlines("a\r\nb\rc\nd"), "a\nb\nc\nd");
  });

  it("counts a browser CRLF line break as one character", () => {
    const message = `${"x".repeat(499)}\r\n${"y".repeat(500)}`;
    const result = validateInquiry({ ...validInquiry, message }, TODAY);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.values.message.includes("\r"), false);
      assert.equal(result.values.message.length, 1000);
    }
  });
});
