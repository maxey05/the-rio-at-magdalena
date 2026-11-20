import { addDays, type BookingStatus, type FieldErrors, type StayKind } from "./rules.ts";
import { getSettings } from "./settings.ts";
import { holdsSlot, monthOf, shiftMonth, type OccupancyRow } from "./stay.ts";
import { db } from "./supabase.ts";

export type MonthCell = {
  d: string;
  guests: number;
  siteCap: number;
  slotsTaken: number;
  slotsTotal: number;
  slotsFree: number;
  dayTours: number;
  closed: boolean;
  fillPercent: number;
};

export type DayBooking = {
  id: string;
  ref: string;
  guest_name: string;
  guests: number;
  status: BookingStatus;
  hold_expires_at: string | null;
};

export type NightBookingRow = { slot_id: number; bookings: DayBooking | null };

export type CampRow = {
  id: number;
  name: string;
  sort: number;
  slots: { id: number; code: string; sort: number; active: boolean }[];
};

export type DayCamp = { id: number; name: string; slots: { id: number; code: string }[] };

export type DayData = {
  camps: DayCamp[];
  bySlot: Map<number, DayBooking>;
  dayTours: DayBooking[];
};

export type TouchingBooking = {
  kind: StayKind;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  hold_expires_at: string | null;
};

export type AffectedBooking = {
  id: string;
  ref: string;
  guestName: string;
  kind: StayKind;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
};

export type Closure = { id: number; start_date: string; end_date: string; reason: string };

export type ClosureInput = { start: string; end: string; reason: string };

export type ClosureResult = { ok: true; value: ClosureInput } | { ok: false; errors: FieldErrors };

export type ClosureState = {
  ok: boolean;
  message: string | null;
  errors: FieldErrors;
  values: ClosureInput;
  affected: AffectedBooking[];
  confirmKey: string;
};

export const REASON_MIN = 3;
export const REASON_MAX = 200;

const MONTH_PATTERN = /^20\d{2}-(0[1-9]|1[0-2])$/;
const DAY_PATTERN = /^20\d{2}-\d{2}-\d{2}$/;
const ACTIVE_QUERY_STATUSES: BookingStatus[] = ["payment_review", "confirmed", "checked_in", "awaiting_payment"];

function isRealDate(date: string): boolean {
  try {
    addDays(date, 0);
    return true;
  } catch {
    return false;
  }
}

export function parseDay(raw: string | undefined): string | null {
  return raw !== undefined && DAY_PATTERN.test(raw) && isRealDate(raw) ? raw : null;
}

export function parseMonth(raw: string | undefined, today: string): string {
  return raw !== undefined && MONTH_PATTERN.test(raw) ? raw : monthOf(today);
}

export function monthRange(month: string): { first: string; last: string } {
  return { first: `${month}-01`, last: addDays(`${shiftMonth(month, 1)}-01`, -1) };
}

export function mondayWeeks(month: string): (string | null)[][] {
  const { first, last } = monthRange(month);
  const leading = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: Number(last.slice(8)) }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return Array.from({ length: cells.length / 7 }, (_, row) => cells.slice(row * 7, row * 7 + 7));
}

export function validateClosure(input: ClosureInput): ClosureResult {
  const start = input.start.trim();
  const end = input.end.trim();
  const reason = input.reason.trim();
  const errors: FieldErrors = {};
  const startOk = DAY_PATTERN.test(start) && isRealDate(start);
  const endOk = DAY_PATTERN.test(end) && isRealDate(end);
  if (!startOk) {
    errors.start = "Enter a valid start date.";
  }
  if (!endOk) {
    errors.end = "Enter a valid end date.";
  } else if (startOk && end < start) {
    errors.end = "The end date cannot be before the start date.";
  }
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) {
    errors.reason = `Give a reason of ${REASON_MIN} to ${REASON_MAX} characters.`;
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: { start, end, reason } };
}

export function bookingTouchesRange(booking: TouchingBooking, start: string, end: string, now: Date): boolean {
  if (!holdsSlot(booking, now)) {
    return false;
  }
  if (booking.kind === "day_tour") {
    return booking.check_in >= start && booking.check_in <= end;
  }
  return booking.check_in <= end && booking.check_out > start;
}

export function confirmKey(start: string, end: string, affected: readonly Pick<AffectedBooking, "id">[]): string {
  return `${start}|${end}|${affected.map((booking) => booking.id).sort().join(",")}`;
}

export function countDayTours(
  rows: readonly { check_in: string; status: BookingStatus; hold_expires_at: string | null }[],
  now: Date,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (holdsSlot(row, now)) {
      counts[row.check_in] = (counts[row.check_in] ?? 0) + 1;
    }
  }
  return counts;
}

export function buildMonthCells(
  rows: readonly OccupancyRow[],
  dayTours: Record<string, number>,
  slotsTotal: number,
  siteCap: number,
): MonthCell[] {
  return rows.map((row) => {
    const guestRatio = siteCap > 0 ? row.guests / siteCap : 0;
    const slotRatio = slotsTotal > 0 ? row.slots_taken / slotsTotal : 0;
    return {
      d: row.d,
      guests: row.guests,
      siteCap,
      slotsTaken: row.slots_taken,
      slotsTotal,
      slotsFree: Math.max(0, slotsTotal - row.slots_taken),
      dayTours: dayTours[row.d] ?? 0,
      closed: row.closed,
      fillPercent: Math.min(100, Math.round(Math.max(guestRatio, slotRatio) * 100)),
    };
  });
}

export function activeCamps(rows: readonly CampRow[]): DayCamp[] {
  return [...rows]
    .sort((a, b) => a.sort - b.sort || a.id - b.id)
    .map((camp) => ({
      id: camp.id,
      name: camp.name,
      slots: camp.slots
        .filter((slot) => slot.active)
        .sort((a, b) => a.sort - b.sort || a.id - b.id)
        .map((slot) => ({ id: slot.id, code: slot.code })),
    }));
}

export function bookingsBySlot(rows: readonly NightBookingRow[], now: Date): Map<number, DayBooking> {
  const bySlot = new Map<number, DayBooking>();
  for (const row of rows) {
    if (row.bookings && holdsSlot(row.bookings, now)) {
      bySlot.set(row.slot_id, row.bookings);
    }
  }
  return bySlot;
}

async function loadCamps(): Promise<DayCamp[]> {
  const { data, error } = await db()
    .from("camps")
    .select("id, name, sort, slots(id, code, sort, active)")
    .eq("active", true)
    .overrideTypes<CampRow[], { merge: false }>();
  if (error) {
    throw new Error(`camps query failed: ${error.message}`);
  }
  return activeCamps(data);
}

async function loadOccupancy(first: string, last: string): Promise<OccupancyRow[]> {
  const { data, error } = await db().rpc("occupancy_between", { p_from: first, p_to: last });
  if (error) {
    throw new Error(`occupancy query failed: ${error.message}`);
  }
  return data ?? [];
}

async function loadDayTourRows(first: string, last: string) {
  const { data, error } = await db()
    .from("bookings")
    .select("check_in, status, hold_expires_at")
    .eq("kind", "day_tour")
    .in("status", ACTIVE_QUERY_STATUSES)
    .gte("check_in", first)
    .lte("check_in", last)
    .overrideTypes<{ check_in: string; status: BookingStatus; hold_expires_at: string | null }[], { merge: false }>();
  if (error) {
    throw new Error(`day tour query failed: ${error.message}`);
  }
  return data;
}

export async function loadMonth(month: string, now: Date = new Date()): Promise<MonthCell[]> {
  const { first, last } = monthRange(month);
  const [settings, camps, rows, tours] = await Promise.all([
    getSettings(),
    loadCamps(),
    loadOccupancy(first, last),
    loadDayTourRows(first, last),
  ]);
  const slotsTotal = camps.reduce((sum, camp) => sum + camp.slots.length, 0);
  return buildMonthCells(rows, countDayTours(tours, now), slotsTotal, settings.siteCap);
}

export async function loadDay(date: string, now: Date = new Date()): Promise<DayData> {
  const [camps, nights, tours] = await Promise.all([
    loadCamps(),
    db()
      .from("booking_nights")
      .select("slot_id, bookings!inner(id, ref, guest_name, guests, status, hold_expires_at)")
      .eq("night", date)
      .overrideTypes<NightBookingRow[], { merge: false }>(),
    db()
      .from("bookings")
      .select("id, ref, guest_name, guests, status, hold_expires_at")
      .eq("kind", "day_tour")
      .eq("check_in", date)
      .in("status", ACTIVE_QUERY_STATUSES)
      .order("created_at")
      .overrideTypes<DayBooking[], { merge: false }>(),
  ]);
  if (nights.error) {
    throw new Error(`booking_nights query failed: ${nights.error.message}`);
  }
  if (tours.error) {
    throw new Error(`day tour query failed: ${tours.error.message}`);
  }
  return {
    camps,
    bySlot: bookingsBySlot(nights.data, now),
    dayTours: tours.data.filter((booking) => holdsSlot(booking, now)),
  };
}

export async function findAffectedBookings(
  start: string,
  end: string,
  now: Date = new Date(),
): Promise<AffectedBooking[]> {
  const { data, error } = await db()
    .from("bookings")
    .select("id, ref, guest_name, kind, check_in, check_out, status, hold_expires_at")
    .in("status", ACTIVE_QUERY_STATUSES)
    .lte("check_in", end)
    .gte("check_out", start)
    .order("check_in")
    .overrideTypes<(TouchingBooking & { id: string; ref: string; guest_name: string })[], { merge: false }>();
  if (error) {
    throw new Error(`affected bookings query failed: ${error.message}`);
  }
  return data
    .filter((booking) => bookingTouchesRange(booking, start, end, now))
    .map((booking) => ({
      id: booking.id,
      ref: booking.ref,
      guestName: booking.guest_name,
      kind: booking.kind,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      status: booking.status,
    }));
}

export async function listUpcomingClosures(today: string): Promise<Closure[]> {
  const { data, error } = await db()
    .from("closures")
    .select("id, start_date, end_date, reason")
    .gte("end_date", today)
    .order("start_date")
    .order("id")
    .overrideTypes<Closure[], { merge: false }>();
  if (error) {
    throw new Error(`closures query failed: ${error.message}`);
  }
  return data;
}

export async function insertClosure(value: ClosureInput, createdBy: string): Promise<void> {
  const { error } = await db()
    .from("closures")
    .insert({ start_date: value.start, end_date: value.end, reason: value.reason, created_by: createdBy });
  if (error) {
    throw new Error(`closure insert failed: ${error.message}`);
  }
}

export async function deleteClosure(id: number): Promise<void> {
  const { error } = await db().from("closures").delete().eq("id", id);
  if (error) {
    throw new Error(`closure delete failed: ${error.message}`);
  }
}
