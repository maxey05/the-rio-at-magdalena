import { DEFAULT_SETTINGS, type Settings } from "./rules.ts";
import { db, type SettingsRow } from "./supabase.ts";

export function mergeSettings(row: SettingsRow | null): Settings {
  if (!row) {
    return { ...DEFAULT_SETTINGS };
  }
  return {
    ...DEFAULT_SETTINGS,
    overnightAdult: row.overnight_adult,
    overnightReduced: row.overnight_reduced,
    dayAdult: row.day_adult,
    dayReduced: row.day_reduced,
    tentPrice: row.tent_price,
    tentStock: row.tent_stock,
    slotCapacity: row.slot_capacity,
    siteCap: row.site_cap,
    windowDays: row.window_days,
    maxNights: row.max_nights,
    holdMinutes: row.hold_minutes,
    downpaymentPct: row.downpayment_pct,
  };
}

export async function getSettings(): Promise<Settings> {
  try {
    const { data, error } = await db().from("settings").select("*").maybeSingle<SettingsRow>();
    if (error) {
      return mergeSettings(null);
    }
    return mergeSettings(data);
  } catch {
    return mergeSettings(null);
  }
}

export type PaymentDetails = {
  gcashName: string | null;
  gcashNumber: string | null;
  gcashQrPath: string | null;
};

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function getPaymentDetails(): Promise<PaymentDetails> {
  const empty: PaymentDetails = { gcashName: null, gcashNumber: null, gcashQrPath: null };
  try {
    const { data, error } = await db()
      .from("settings")
      .select("gcash_name, gcash_number, gcash_qr_path")
      .maybeSingle<Pick<SettingsRow, "gcash_name" | "gcash_number" | "gcash_qr_path">>();
    if (error || !data) {
      return empty;
    }
    return {
      gcashName: clean(data.gcash_name),
      gcashNumber: clean(data.gcash_number),
      gcashQrPath: clean(data.gcash_qr_path),
    };
  } catch {
    return empty;
  }
}
