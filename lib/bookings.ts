import { newAccessToken, newRef, type GuestCounts, type PriceQuote, type StayKind } from "./rules.ts";
import { slotLabel } from "./stay.ts";
import { db, type Booking } from "./supabase.ts";

export type NewBooking = {
  kind: StayKind;
  checkIn: string;
  nights: number;
  name: string;
  email: string;
  mobile: string;
  notes: string;
  guests: GuestCounts;
  tents: number;
  slotIds: number[];
  quote: PriceQuote;
};

export type CreateFailure =
  | { ok: false; code: "slot_taken"; slotId: number | null; night: string | null }
  | { ok: false; code: "site_full" | "tents_unavailable"; date: string }
  | { ok: false; code: "closed" | "invalid" | "error" };

export type CreateResult = { ok: true; id: string; ref: string; token: string } | CreateFailure;

const DATE_TEXT = "(\\d{4}-\\d{2}-\\d{2})";
const SITE_FULL_PATTERN = new RegExp(`^site_full:${DATE_TEXT}$`);
const TENTS_PATTERN = new RegExp(`^tents_unavailable:${DATE_TEXT}$`);
const SLOT_TAKEN_DETAIL = new RegExp(`slot_id=(\\d+) night=${DATE_TEXT}`);
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;
const UNIQUE_VIOLATION = "23505";
const INVALID_CODES = new Set([
  "invalid_input",
  "day_tour_slots",
  "slots_required",
  "slot_invalid",
  "slot_capacity",
]);

export function parseCreateError(message: string, details: string | null): CreateFailure {
  if (message === "slot_taken") {
    const match = SLOT_TAKEN_DETAIL.exec(details ?? "");
    return { ok: false, code: "slot_taken", slotId: match ? Number(match[1]) : null, night: match ? match[2] : null };
  }
  const full = SITE_FULL_PATTERN.exec(message);
  if (full) {
    return { ok: false, code: "site_full", date: full[1] };
  }
  const tents = TENTS_PATTERN.exec(message);
  if (tents) {
    return { ok: false, code: "tents_unavailable", date: tents[1] };
  }
  if (message === "closed") {
    return { ok: false, code: "closed" };
  }
  return { ok: false, code: INVALID_CODES.has(message) ? "invalid" : "error" };
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function payload(input: NewBooking) {
  return {
    kind: input.kind,
    check_in: input.checkIn,
    nights: input.nights,
    guest_name: input.name,
    email: input.email,
    mobile: input.mobile,
    notes: input.notes,
    adults: input.guests.adults,
    seniors: input.guests.seniors,
    kids: input.guests.kids,
    infants: input.guests.infants,
    tents: input.tents,
    slot_ids: input.slotIds,
    adult_rate: input.quote.adultRate,
    reduced_rate: input.quote.reducedRate,
    tent_rate: input.quote.tentRate,
    total: input.quote.total,
    downpayment: input.quote.downpayment,
    balance: input.quote.balance,
    ref: newRef(randomBytes(32)),
    access_token: newAccessToken(randomBytes(32)),
  };
}

type CreatedRow = { id: string; ref: string; access_token: string };

async function callCreate(input: NewBooking): Promise<CreateResult | "unique_violation"> {
  const { data, error } = await db().rpc("create_booking", { p: payload(input) });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return "unique_violation";
    }
    const failure = parseCreateError(error.message, error.details);
    if (failure.code === "error") {
      console.error("create_booking failed", error.code, error.message);
    }
    return failure;
  }
  const row: CreatedRow | undefined = Array.isArray(data) ? data[0] : data;
  if (!row) {
    console.error("create_booking returned no row");
    return { ok: false, code: "error" };
  }
  return { ok: true, id: row.id, ref: row.ref, token: row.access_token };
}

export async function createBooking(input: NewBooking): Promise<CreateResult> {
  const first = await callCreate(input);
  if (first !== "unique_violation") {
    return first;
  }
  const second = await callCreate(input);
  return second === "unique_violation" ? { ok: false, code: "error" } : second;
}

export async function findByToken(token: string): Promise<Booking | null> {
  if (!TOKEN_PATTERN.test(token)) {
    return null;
  }
  const { data, error } = await db().from("bookings").select("*").eq("access_token", token).maybeSingle<Booking>();
  if (error) {
    throw new Error(`booking lookup failed: ${error.message}`);
  }
  return data;
}

type LabelRow = { id: number; code: string; sort: number; camps: { name: string; sort: number } };

export async function slotLabels(slotIds: readonly number[]): Promise<string[]> {
  if (slotIds.length === 0) {
    return [];
  }
  const { data, error } = await db()
    .from("slots")
    .select("id, code, sort, camps!inner(name, sort)")
    .in("id", [...slotIds])
    .overrideTypes<LabelRow[], { merge: false }>();
  if (error) {
    throw new Error(`slot lookup failed: ${error.message}`);
  }
  return [...data]
    .sort((a, b) => a.camps.sort - b.camps.sort || a.sort - b.sort)
    .map((row) => slotLabel(row.camps.name, row.code));
}

export function bookingSlotLabels(booking: Pick<Booking, "slot_ids">): Promise<string[]> {
  return slotLabels(booking.slot_ids);
}

export async function countActiveSlots(slotIds: readonly number[]): Promise<number> {
  if (slotIds.length === 0) {
    return 0;
  }
  const { data, error } = await db()
    .from("slots")
    .select("id, camps!inner(active)")
    .in("id", [...slotIds])
    .eq("active", true)
    .eq("camps.active", true);
  if (error) {
    throw new Error(`slot check failed: ${error.message}`);
  }
  return data.length;
}
