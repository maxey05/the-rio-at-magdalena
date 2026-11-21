import { bookingWindow, heldNights, manilaToday, validateStay, type Settings, type StayKind } from "./rules.ts";
import { getSettings } from "./settings.ts";
import { buildDates, takenSlotIds, type AvailabilityResponse, type NightRow, type OccupancyRow, type SlotAvailability } from "./stay.ts";
import { db } from "./supabase.ts";

type SlotRow = {
  id: number;
  code: string;
  description: string;
  sort: number;
  map_x: number | null;
  map_y: number | null;
  camps: { name: string; sort: number };
};

export type StayQuery = {
  checkIn: string;
  nights: number;
};

async function loadSlots(): Promise<SlotRow[]> {
  const { data, error } = await db()
    .from("slots")
    .select("id, code, description, sort, map_x, map_y, camps!inner(name, sort, active)")
    .eq("active", true)
    .eq("camps.active", true)
    .overrideTypes<SlotRow[], { merge: false }>();
  if (error) {
    throw new Error(`slots query failed: ${error.message}`);
  }
  return [...data].sort((a, b) => a.camps.sort - b.camps.sort || a.sort - b.sort);
}

async function loadOccupancy(first: string, last: string): Promise<OccupancyRow[]> {
  const { data, error } = await db().rpc("occupancy_between", { p_from: first, p_to: last });
  if (error) {
    throw new Error(`occupancy query failed: ${error.message}`);
  }
  return data ?? [];
}

async function loadNights(firstNight: string, lastNight: string): Promise<NightRow[]> {
  const { data, error } = await db()
    .from("booking_nights")
    .select("slot_id, night, bookings!inner(status, hold_expires_at)")
    .gte("night", firstNight)
    .lte("night", lastNight)
    .overrideTypes<NightRow[], { merge: false }>();
  if (error) {
    throw new Error(`booking_nights query failed: ${error.message}`);
  }
  return data;
}

function toSlotAvailability(rows: readonly SlotRow[], taken: ReadonlySet<number>): SlotAvailability[] {
  return rows.map((row) => ({
    id: row.id,
    camp: row.camps.name,
    code: row.code,
    description: row.description,
    free: !taken.has(row.id),
    mapX: row.map_x,
    mapY: row.map_y,
  }));
}

export function validStay(stay: StayQuery | null, kind: StayKind, today: string, s: Settings): stay is StayQuery {
  return stay !== null && validateStay({ kind, checkIn: stay.checkIn, nights: stay.nights }, today, s).ok;
}

export async function getAvailability(
  kind: StayKind,
  stay: StayQuery | null,
  now: Date = new Date(),
): Promise<AvailabilityResponse> {
  const settings = await getSettings();
  const today = manilaToday(now);
  const window = bookingWindow(today, settings);
  const slotRows = loadSlots();
  const occupancy = loadOccupancy(window.first, window.last);
  const [slots, rows] = await Promise.all([slotRows, occupancy]);
  const dates = buildDates(rows, slots.length, settings);
  if (!validStay(stay, kind, today, settings)) {
    return { dates };
  }
  const nights = heldNights(kind, stay.checkIn, stay.nights);
  const taken = takenSlotIds(await loadNights(nights[0], nights[nights.length - 1]), now);
  return { dates, slots: toSlotAvailability(slots, taken) };
}
