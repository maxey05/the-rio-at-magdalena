import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "./rules.ts";
import { getSettings, mergeSettings } from "./settings.ts";
import type { SettingsRow } from "./supabase.ts";

const row: SettingsRow = {
  id: true,
  overnight_adult: 600,
  overnight_reduced: 400,
  day_adult: 350,
  day_reduced: 250,
  tent_price: 550,
  tent_stock: 8,
  slot_capacity: 12,
  site_cap: 120,
  window_days: 60,
  max_nights: 5,
  hold_minutes: 45,
  downpayment_pct: 30,
  gcash_name: null,
  gcash_number: null,
  gcash_qr_path: null,
  deposit_note: "Amount confirmed at check-in",
  contact_phone: null,
  contact_email: null,
  updated_at: "2026-11-19T00:00:00Z",
};

describe("mergeSettings", () => {
  it("returns the defaults when the table is empty", () => {
    assert.deepEqual(mergeSettings(null), DEFAULT_SETTINGS);
  });

  it("returns a copy, not the shared defaults object", () => {
    assert.notEqual(mergeSettings(null), DEFAULT_SETTINGS);
  });

  it("maps every column of the row onto the camelCase settings", () => {
    assert.deepEqual(mergeSettings(row), {
      overnightAdult: 600,
      overnightReduced: 400,
      dayAdult: 350,
      dayReduced: 250,
      tentPrice: 550,
      tentStock: 8,
      slotCapacity: 12,
      siteCap: 120,
      windowDays: 60,
      maxNights: 5,
      holdMinutes: 45,
      downpaymentPct: 30,
    });
  });
});

describe("getSettings", () => {
  it("returns the defaults instead of throwing when the Supabase env vars are missing", async () => {
    const names = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
    const saved = names.map((name) => process.env[name]);
    for (const name of names) {
      delete process.env[name];
    }
    try {
      assert.deepEqual(await getSettings(), DEFAULT_SETTINGS);
    } finally {
      names.forEach((name, index) => {
        const value = saved[index];
        if (value !== undefined) {
          process.env[name] = value;
        }
      });
    }
  });
});
