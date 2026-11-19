import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRateCards, buildRatesExample, camps, faq, gallery, houseRules, openCamps, ratesExample } from "./content.ts";
import { DEFAULT_SETTINGS } from "./rules.ts";

describe("ratesExample", () => {
  it("prices 2 adults and 1 child aged 6 for 2 nights at 2700", () => {
    assert.equal(ratesExample.nightlyTotal, 1350);
    assert.equal(ratesExample.total, 2700);
  });

  it("splits the total into a 1350 downpayment and a 1350 balance", () => {
    assert.equal(ratesExample.downpayment, 1350);
    assert.equal(ratesExample.balance, 1350);
  });

  it("writes the formula with peso amounts", () => {
    assert.equal(ratesExample.formula, "(₱500 × 2 + ₱350) × 2 = ₱2,700");
  });

  it("rounds the downpayment up and keeps downpayment plus balance equal to the total", () => {
    const example = buildRatesExample({ ...DEFAULT_SETTINGS, overnightReduced: 351, downpaymentPct: 33 });
    assert.equal(example.total, 2702);
    assert.equal(example.downpayment, 892);
    assert.equal(example.downpayment + example.balance, example.total);
  });
});

describe("rateCards", () => {
  it("shows the overnight rates from the owner", () => {
    const overnight = buildRateCards(DEFAULT_SETTINGS)[0];
    assert.deepEqual(
      overnight.rows.map((row) => row.price),
      ["₱500", "₱350", "Free"],
    );
  });

  it("shows the day tour rates from the owner", () => {
    const dayTour = buildRateCards(DEFAULT_SETTINGS)[1];
    assert.deepEqual(
      dayTour.rows.map((row) => row.price),
      ["₱300", "₱200", "Free"],
    );
  });
});

describe("camps", () => {
  it("lists nine slots in Camp 1 and seven in Camp 2", () => {
    assert.deepEqual(camps[0].slots, ["A", "B", "C", "D", "E", "F", "G", "H", "I"]);
    assert.deepEqual(camps[1].slots, ["J", "K", "L1", "L2", "M", "N", "O"]);
  });

  it("keeps Camps 3 and 4 closed", () => {
    assert.deepEqual(
      camps.filter((camp) => camp.status === "coming-soon").map((camp) => camp.name),
      ["Camp 3", "Camp 4"],
    );
    assert.equal(openCamps.length, 2);
  });
});

describe("houseRules", () => {
  it("lists the six house rules from the owner", () => {
    assert.equal(houseRules.length, 6);
  });
});

describe("gallery and faq", () => {
  it("gives every photo alt text and unique ids", () => {
    const ids = new Set(gallery.map((photo) => photo.id));
    assert.equal(ids.size, gallery.length);
    for (const photo of gallery) {
      assert.ok(photo.alt.length > 10);
    }
  });

  it("only points to photo files that follow the photos folder naming", () => {
    for (const photo of gallery) {
      if (photo.src !== null) {
        assert.match(photo.src, /^\/photos\/[a-z0-9-]+\.webp$/);
      }
    }
  });

  it("has an answer for every question", () => {
    for (const item of faq) {
      assert.ok(item.question.endsWith("?"));
      assert.ok(item.answer.length > 0);
    }
  });
});
