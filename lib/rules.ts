export type ManilaNow = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const manilaFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const pesoFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const part = parts.find((candidate) => candidate.type === type);
  if (!part) {
    throw new Error(`Missing ${type} in Manila date parts`);
  }
  return Number(part.value);
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

function parseDate(date: string): Date {
  const match = DATE_PATTERN.exec(date);
  if (!match) {
    throw new RangeError(`Expected a YYYY-MM-DD date, received "${date}"`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  if (!isRealDate) {
    throw new RangeError(`"${date}" is not a real calendar date`);
  }
  return parsed;
}

export function manilaNow(now: Date = new Date()): ManilaNow {
  const parts = manilaFormatter.formatToParts(now);
  return {
    year: readPart(parts, "year"),
    month: readPart(parts, "month"),
    day: readPart(parts, "day"),
    hour: readPart(parts, "hour"),
    minute: readPart(parts, "minute"),
    second: readPart(parts, "second"),
  };
}

export function manilaToday(now: Date = new Date()): string {
  const { year, month, day } = manilaNow(now);
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

export function addDays(date: string, days: number): string {
  const parsed = parseDate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return `${pad(parsed.getUTCFullYear(), 4)}-${pad(parsed.getUTCMonth() + 1, 2)}-${pad(parsed.getUTCDate(), 2)}`;
}

export function formatPeso(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}₱${pesoFormatter.format(Math.abs(amount))}`;
}

export type Settings = {
  overnightAdult: number;
  overnightReduced: number;
  dayAdult: number;
  dayReduced: number;
  tentPrice: number;
  tentStock: number;
  slotCapacity: number;
  siteCap: number;
  windowDays: number;
  maxNights: number;
  holdMinutes: number;
  downpaymentPct: number;
};

export const DEFAULT_SETTINGS: Settings = {
  overnightAdult: 500,
  overnightReduced: 350,
  dayAdult: 300,
  dayReduced: 200,
  tentPrice: 500,
  tentStock: 5,
  slotCapacity: 10,
  siteCap: 100,
  windowDays: 90,
  maxNights: 30,
  holdMinutes: 30,
  downpaymentPct: 50,
};

export const STATUSES = [
  "awaiting_payment",
  "payment_review",
  "confirmed",
  "checked_in",
  "completed",
  "expired",
  "rejected",
  "cancelled",
  "no_show",
] as const;

export type BookingStatus = (typeof STATUSES)[number];

export type StayKind = "overnight" | "day_tour";

export type StayInput = {
  kind: StayKind;
  checkIn: string;
  nights: number;
};

export type GuestCounts = {
  adults: number;
  seniors: number;
  kids: number;
  infants: number;
};

export type PriceInput = GuestCounts & {
  kind: StayKind;
  nights: number;
  tents: number;
};

export type PriceLine = {
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type PriceQuote = {
  adultRate: number;
  reducedRate: number;
  tentRate: number;
  lines: PriceLine[];
  total: number;
  downpayment: number;
  balance: number;
};

export type SlotCheck = {
  ok: boolean;
  neededSlots: number;
};

export type FieldErrors = Record<string, string>;

export type StayResult = { ok: true; errors: Record<string, never> } | { ok: false; errors: FieldErrors };

export type DetailsForm = {
  name: string;
  email: string;
  mobile: string;
  notes: string;
  agreeRules: boolean;
  agreePrivacy: boolean;
};

export type DetailsValues = {
  name: string;
  email: string;
  mobile: string;
  notes: string;
};

export type DetailsResult =
  | { ok: true; errors: Record<string, never>; values: DetailsValues }
  | { ok: false; errors: FieldErrors };

const NAME_MIN = 2;
const NAME_MAX = 80;
const NOTES_MAX = 500;
const EMAIL_MAX = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const LOCAL_MOBILE_PATTERN = /^09\d{9}$/;
const INTERNATIONAL_MOBILE_PATTERN = /^\+639\d{9}$/;
const GCASH_REF_PATTERN = /^\d{13}$/;
const REF_PREFIX = "RIO-";
const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const REF_LENGTH = 6;
const REF_BYTE_LIMIT = REF_ALPHABET.length * Math.floor(256 / REF_ALPHABET.length);
const ACCESS_TOKEN_BYTES = 32;
const CANCELLABLE_STATUSES: readonly BookingStatus[] = ["awaiting_payment", "payment_review", "confirmed"];

const STATUS_LABELS: Record<BookingStatus, string> = {
  awaiting_payment: "Awaiting payment",
  payment_review: "Payment review",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  completed: "Completed",
  expired: "Expired",
  rejected: "Rejected",
  cancelled: "Cancelled",
  no_show: "No-show",
};

function isRealDate(date: string): boolean {
  try {
    parseDate(date);
    return true;
  } catch {
    return false;
  }
}

function ceilDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator + denominator - 1) / denominator);
}

export function bookingWindow(today: string, s: Settings): { first: string; last: string } {
  return { first: addDays(today, 1), last: addDays(today, s.windowDays) };
}

export function isBookableDate(date: string, today: string, s: Settings): boolean {
  if (!isRealDate(date)) {
    return false;
  }
  const { first, last } = bookingWindow(today, s);
  return date >= first && date <= last;
}

export function stayNights(checkIn: string, nights: number): string[] {
  if (!Number.isInteger(nights) || nights < 0) {
    throw new RangeError(`Expected a whole number of nights, received ${nights}`);
  }
  return Array.from({ length: nights }, (_, index) => addDays(checkIn, index));
}

// The nights a booking holds its slots. A stay holds each night from check-in;
// a day tour holds only its own date.
export function heldNights(kind: StayKind, checkIn: string, nights: number): string[] {
  return kind === "day_tour" ? [checkIn] : stayNights(checkIn, nights);
}

export function validateStay(input: StayInput, today: string, s: Settings): StayResult {
  if (!isBookableDate(input.checkIn, today, s)) {
    return { ok: false, errors: { checkIn: "Choose a date inside the booking window." } };
  }
  if (input.kind === "day_tour") {
    return { ok: true, errors: {} };
  }
  if (!Number.isInteger(input.nights) || input.nights < 1 || input.nights > s.maxNights) {
    return { ok: false, errors: { nights: `Choose between 1 and ${s.maxNights} nights.` } };
  }
  if (!isBookableDate(addDays(input.checkIn, input.nights - 1), today, s)) {
    return { ok: false, errors: { nights: "Your stay runs past the last bookable date." } };
  }
  return { ok: true, errors: {} };
}

export function guestCount(guests: GuestCounts): number {
  return guests.adults + guests.seniors + guests.kids + guests.infants;
}

function priceLine(label: string, quantity: number, unitPrice: number): PriceLine {
  return { label, quantity, unitPrice, amount: quantity * unitPrice };
}

export function priceBooking(input: PriceInput, s: Settings): PriceQuote {
  const overnight = input.kind === "overnight";
  const nights = overnight ? input.nights : 1;
  const adultRate = overnight ? s.overnightAdult : s.dayAdult;
  const reducedRate = overnight ? s.overnightReduced : s.dayReduced;
  const tentRate = s.tentPrice;
  const tents = input.tents;
  const suffix = overnight ? ` (${nights} ${nights === 1 ? "night" : "nights"})` : "";
  const lines = [
    priceLine(`Adults${suffix}`, input.adults, adultRate * nights),
    priceLine(`Seniors${suffix}`, input.seniors, reducedRate * nights),
    priceLine(`Kids${suffix}`, input.kids, reducedRate * nights),
    priceLine(`Tents${suffix}`, tents, tentRate * nights),
  ].filter((line) => line.quantity > 0);
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const downpayment = ceilDiv(total * s.downpaymentPct, 100);
  return { adultRate, reducedRate, tentRate, lines, total, downpayment, balance: total - downpayment };
}

export function checkSlotCapacity(guests: number, slotCount: number, s: Settings): SlotCheck {
  const neededSlots = Math.max(1, Math.ceil(guests / s.slotCapacity));
  return { ok: slotCount >= 1 && guests <= slotCount * s.slotCapacity, neededSlots };
}

export function normalizeMobile(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().]/g, "");
  if (LOCAL_MOBILE_PATTERN.test(cleaned)) {
    return `+63${cleaned.slice(1)}`;
  }
  if (INTERNATIONAL_MOBILE_PATTERN.test(cleaned)) {
    return cleaned;
  }
  return null;
}

export function normalizeGcashRef(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, "");
  return GCASH_REF_PATTERN.test(cleaned) ? cleaned : null;
}

function validateName(name: string): string | null {
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return `Enter your full name (${NAME_MIN} to ${NAME_MAX} characters).`;
  }
  return null;
}

function validateEmail(email: string): string | null {
  if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validateDetails(form: DetailsForm): DetailsResult {
  const name = form.name.trim();
  const email = form.email.trim().toLowerCase();
  const mobile = normalizeMobile(form.mobile);
  const notes = form.notes.trim();
  const errors: FieldErrors = {};
  const nameError = validateName(name);
  const emailError = validateEmail(email);
  if (nameError) {
    errors.name = nameError;
  }
  if (emailError) {
    errors.email = emailError;
  }
  if (mobile === null) {
    errors.mobile = "Enter a Philippine mobile number like 0917 123 4567.";
  }
  if (notes.length > NOTES_MAX) {
    errors.notes = `Keep notes to ${NOTES_MAX} characters or fewer.`;
  }
  if (!form.agreeRules) {
    errors.agreeRules = "Please agree to the camping agreement.";
  }
  if (!form.agreePrivacy) {
    errors.agreePrivacy = "Please agree to the privacy notice.";
  }
  if (Object.keys(errors).length > 0 || mobile === null) {
    return { ok: false, errors };
  }
  return { ok: true, errors: {}, values: { name, email, mobile, notes } };
}

export const INQUIRY_TYPES = ["Intimate event", "Prenup shoot", "Other"] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number];

export type InquiryForm = {
  name: string;
  mobile: string;
  email: string;
  type: string;
  preferredDate: string;
  guests: string;
  message: string;
  agreePrivacy: boolean;
  website: string;
};

export type InquiryValues = {
  name: string;
  mobile: string;
  email: string;
  type: InquiryType;
  preferred_date: string | null;
  guests: number;
  message: string;
};

export type InquiryFormValues = Omit<InquiryForm, "website">;

export type InquiryState = {
  ok: boolean;
  message: string | null;
  errors: FieldErrors;
  values: InquiryFormValues;
};

export function normalizeNewlines(raw: string): string {
  return raw.replace(/\r\n?/g, "\n");
}

export type InquiryResult =
  | { ok: true; errors: Record<string, never>; values: InquiryValues }
  | { ok: false; errors: FieldErrors; spam?: true };

export const INQUIRY_GUESTS_MAX = 300;
export const INQUIRY_MESSAGE_MIN = 10;
export const INQUIRY_MESSAGE_MAX = 1000;
export const INQUIRY_DAILY_LIMIT = 3;
const GUEST_COUNT_PATTERN = /^\d{1,3}$/;

function validatePreferredDate(raw: string, today: string): string | null {
  if (!isRealDate(raw)) {
    return "Choose a real date, or leave it empty.";
  }
  return raw < today ? "Choose today or a later date, or leave it empty." : null;
}

export function validateInquiry(form: InquiryForm, today: string): InquiryResult {
  if (form.website.trim() !== "") {
    return { ok: false, errors: {}, spam: true };
  }
  const name = form.name.trim();
  const email = form.email.trim().toLowerCase();
  const mobile = normalizeMobile(form.mobile);
  const type = INQUIRY_TYPES.find((candidate) => candidate === form.type);
  const preferredDate = form.preferredDate.trim();
  const guestsText = form.guests.trim();
  const guests = GUEST_COUNT_PATTERN.test(guestsText) ? Number(guestsText) : null;
  const message = normalizeNewlines(form.message).trim();
  const errors: FieldErrors = {};
  const nameError = validateName(name);
  const emailError = validateEmail(email);
  const dateError = preferredDate === "" ? null : validatePreferredDate(preferredDate, today);
  if (nameError) {
    errors.name = nameError;
  }
  if (mobile === null) {
    errors.mobile = "Enter a Philippine mobile number like 0917 123 4567.";
  }
  if (emailError) {
    errors.email = emailError;
  }
  if (type === undefined) {
    errors.type = "Choose what you are planning.";
  }
  if (dateError) {
    errors.preferredDate = dateError;
  }
  if (guests === null || guests < 1 || guests > INQUIRY_GUESTS_MAX) {
    errors.guests = `Enter a number of guests from 1 to ${INQUIRY_GUESTS_MAX}.`;
  }
  if (message.length < INQUIRY_MESSAGE_MIN || message.length > INQUIRY_MESSAGE_MAX) {
    errors.message = `Write between ${INQUIRY_MESSAGE_MIN} and ${INQUIRY_MESSAGE_MAX} characters.`;
  }
  if (!form.agreePrivacy) {
    errors.agreePrivacy = "Please agree to the privacy notice.";
  }
  if (Object.keys(errors).length > 0 || mobile === null || type === undefined || guests === null) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    errors: {},
    values: { name, mobile, email, type, preferred_date: preferredDate === "" ? null : preferredDate, guests, message },
  };
}

export function newRef(randomBytes: ArrayLike<number>): string {
  let code = "";
  for (let index = 0; index < randomBytes.length && code.length < REF_LENGTH; index += 1) {
    const byte = randomBytes[index];
    if (byte < REF_BYTE_LIMIT) {
      code += REF_ALPHABET[byte % REF_ALPHABET.length];
    }
  }
  if (code.length < REF_LENGTH) {
    throw new RangeError("Not enough usable random bytes for a reference, pass at least 32");
  }
  return `${REF_PREFIX}${code}`;
}

export function newAccessToken(randomBytes: ArrayLike<number>): string {
  if (randomBytes.length !== ACCESS_TOKEN_BYTES) {
    throw new RangeError(`Expected ${ACCESS_TOKEN_BYTES} random bytes, received ${randomBytes.length}`);
  }
  const binary = String.fromCharCode(...Array.from(randomBytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function statusLabel(status: BookingStatus): string {
  return STATUS_LABELS[status];
}

export function isGuestCancellable(booking: { status: BookingStatus; checkIn: string }, today: string): boolean {
  return CANCELLABLE_STATUSES.includes(booking.status) && today < booking.checkIn;
}

const REASON_MIN = 10;
const REASON_MAX = 300;
const PESO_PATTERN = /^\d{1,7}$/;

export type ReasonResult = { ok: true; value: string } | { ok: false; error: string };

export function validateReason(raw: string): ReasonResult {
  const value = raw.trim();
  if (value.length < REASON_MIN) {
    return { ok: false, error: `Give a reason of at least ${REASON_MIN} characters.` };
  }
  if (value.length > REASON_MAX) {
    return { ok: false, error: `Keep the reason to ${REASON_MAX} characters or fewer.` };
  }
  return { ok: true, value };
}

export function parsePesos(raw: string): number | null {
  const cleaned = raw.trim().replace(/,/g, "");
  return PESO_PATTERN.test(cleaned) ? Number(cleaned) : null;
}

export function canMarkNoShow(checkIn: string, today: string): boolean {
  return today >= checkIn;
}
