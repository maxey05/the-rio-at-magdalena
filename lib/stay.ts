import {
  addDays,
  isBookableDate,
  stayNights,
  validateStay,
  type BookingStatus,
  type Settings,
  type StayKind,
} from "./rules.ts";

export type DateState = "available" | "few" | "full" | "closed";

export type DateAvailability = {
  d: string;
  state: DateState;
  guestsLeft: number;
  tentsLeft: number;
};

export type SlotAvailability = {
  id: number;
  camp: string;
  code: string;
  description: string;
  free: boolean;
  mapX: number | null;
  mapY: number | null;
};

export type AvailabilityResponse = {
  dates: DateAvailability[];
  slots?: SlotAvailability[];
};

export type OccupancyRow = {
  d: string;
  guests: number;
  slots_taken: number;
  tents: number;
  closed: boolean;
};

export type NightRow = {
  slot_id: number;
  night: string;
  bookings: { status: BookingStatus; hold_expires_at: string | null } | null;
};

export type StepId = "type" | "dates" | "slots" | "guests" | "details" | "review";

export type Selection = {
  kind: StayKind | null;
  checkIn: string | null;
  nights: number;
  slotIds: number[];
};

export type StayLimits = {
  maxNights: number;
  maxGuests: number;
  maxTents: number;
};

export const FEW_GUESTS_LEFT = 20;
export const FEW_SLOTS_LEFT = 1;
const MAX_URL_SLOTS = 20;

const OVERNIGHT_STEPS: readonly StepId[] = ["type", "dates", "slots", "guests", "details", "review"];
const DAY_TOUR_STEPS: readonly StepId[] = ["type", "dates", "slots", "guests", "details", "review"];

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const dayWithYearFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const longDayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function slotLabel(campName: string, code: string): string {
  return `${campName} Slot ${code}`;
}

export function formatDay(date: string): string {
  return dayFormatter.format(toUtc(date));
}

export function formatDayWithYear(date: string): string {
  return dayWithYearFormatter.format(toUtc(date));
}

export function formatDayLong(date: string): string {
  return longDayFormatter.format(toUtc(date));
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function monthLabel(month: string): string {
  return monthFormatter.format(toUtc(`${month}-01`));
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthWeeks(month: string): (string | null)[][] {
  const first = toUtc(`${month}-01`);
  const leading = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return Array.from({ length: cells.length / 7 }, (_, row) => cells.slice(row * 7, row * 7 + 7));
}

export function dateState(input: { closed: boolean; guestsLeft: number; freeSlots: number | null }): DateState {
  const { closed, guestsLeft, freeSlots } = input;
  if (closed) {
    return "closed";
  }
  if (guestsLeft <= 0 || (freeSlots !== null && freeSlots <= 0)) {
    return "full";
  }
  if (guestsLeft < FEW_GUESTS_LEFT || (freeSlots !== null && freeSlots <= FEW_SLOTS_LEFT)) {
    return "few";
  }
  return "available";
}

export function buildDates(rows: readonly OccupancyRow[], totalSlots: number, s: Settings): DateAvailability[] {
  return rows.map((row) => {
    const guestsLeft = Math.max(0, s.siteCap - row.guests);
    const freeSlots = Math.max(0, totalSlots - row.slots_taken);
    return {
      d: row.d,
      state: dateState({ closed: row.closed, guestsLeft, freeSlots }),
      guestsLeft,
      tentsLeft: Math.max(0, s.tentStock - row.tents),
    };
  });
}

export function holdsSlot(booking: NightRow["bookings"], now: Date): boolean {
  if (!booking) {
    return false;
  }
  if (booking.status === "payment_review" || booking.status === "confirmed" || booking.status === "checked_in") {
    return true;
  }
  return (
    booking.status === "awaiting_payment" &&
    booking.hold_expires_at !== null &&
    new Date(booking.hold_expires_at).getTime() > now.getTime()
  );
}

export function takenSlotIds(rows: readonly NightRow[], now: Date): Set<number> {
  return new Set(rows.filter((row) => holdsSlot(row.bookings, now)).map((row) => row.slot_id));
}

function isOpen(day: DateAvailability | undefined): day is DateAvailability {
  return day !== undefined && day.state !== "closed" && day.state !== "full";
}

export function stayLimits(
  dates: readonly DateAvailability[],
  checkIn: string,
  nights: number,
  kind: StayKind,
  s: Settings,
): StayLimits {
  const byDate = new Map(dates.map((day) => [day.d, day]));
  if (kind === "day_tour") {
    const day = byDate.get(checkIn);
    return {
      maxNights: 0,
      maxGuests: isOpen(day) ? day.guestsLeft : 0,
      maxTents: isOpen(day) ? Math.min(s.tentStock, day.tentsLeft) : 0,
    };
  }
  let maxNights = 0;
  while (maxNights < s.maxNights && isOpen(byDate.get(addDays(checkIn, maxNights)))) {
    maxNights += 1;
  }
  const counted = Math.max(1, Math.min(nights, maxNights));
  const stay = stayNights(checkIn, counted).map((night) => byDate.get(night));
  return {
    maxNights,
    maxGuests: Math.min(...stay.map((day) => day?.guestsLeft ?? 0)),
    maxTents: Math.min(s.tentStock, ...stay.map((day) => day?.tentsLeft ?? 0)),
  };
}

export function visibleSteps(kind: StayKind | null): readonly StepId[] {
  return kind === "day_tour" ? DAY_TOUR_STEPS : OVERNIGHT_STEPS;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseKind(value: string | undefined): StayKind | null {
  return value === "overnight" || value === "day_tour" ? value : null;
}

function parseInteger(value: string | undefined): number | null {
  return value !== undefined && /^\d{1,4}$/.test(value) ? Number(value) : null;
}

function parseSlotIds(value: string | undefined): number[] {
  if (!value) {
    return [];
  }
  const ids = value
    .split(",")
    .map((part) => parseInteger(part))
    .filter((id): id is number => id !== null && id > 0);
  return [...new Set(ids)].slice(0, MAX_URL_SLOTS);
}

export function parseSelection(
  params: Record<string, string | string[] | undefined>,
  today: string,
  s: Settings,
): Selection {
  const kind = parseKind(firstParam(params.type));
  const rawCheckIn = firstParam(params.in) ?? "";
  if (kind === null || !isBookableDate(rawCheckIn, today, s)) {
    return { kind, checkIn: null, nights: 1, slotIds: [] };
  }
  const requested = parseInteger(firstParam(params.n)) ?? 1;
  const nights = validateStay({ kind, checkIn: rawCheckIn, nights: requested }, today, s).ok ? requested : 1;
  const slotIds = parseSlotIds(firstParam(params.slots));
  return { kind, checkIn: rawCheckIn, nights, slotIds };
}

export function selectionQuery(selection: Selection): string {
  const query = new URLSearchParams();
  if (selection.kind) {
    query.set("type", selection.kind);
  }
  if (selection.kind && selection.checkIn) {
    query.set("in", selection.checkIn);
    if (selection.kind === "overnight") {
      query.set("n", String(selection.nights));
    }
    if (selection.slotIds.length > 0) {
      query.set("slots", selection.slotIds.join(","));
    }
  }
  return query.toString().replaceAll("%2C", ",");
}
