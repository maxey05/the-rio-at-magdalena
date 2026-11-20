import type { EmailKind } from "./email.ts";
import {
  addDays,
  DEFAULT_SETTINGS,
  manilaNow,
  normalizeMobile,
  priceBooking,
  type BookingStatus,
  type FieldErrors,
  type PriceLine,
} from "./rules.ts";
import { formatDayWithYear } from "./stay.ts";
import { db, type Booking } from "./supabase.ts";

export type AdminActionState = {
  ok: boolean;
  message: string | null;
  errors?: FieldErrors;
  emailFailed?: boolean;
  handled?: boolean;
};

export const HANDLED_MESSAGE =
  "Already handled. This booking was updated by someone else, so nothing was changed and no email was sent.";
export const ERROR_MESSAGE = "Something went wrong. Reload the page to see the current state, then try again.";

export function actionFailed(message: string | null, errors?: FieldErrors): AdminActionState {
  return { ok: false, message, errors };
}

export function actionHandled(message: string = HANDLED_MESSAGE): AdminActionState {
  return { ok: false, handled: true, message };
}

export async function runAction(work: () => Promise<AdminActionState>): Promise<AdminActionState> {
  try {
    return await work();
  } catch (error) {
    console.error("admin action failed", error);
    return actionFailed(ERROR_MESSAGE);
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export const BOOKING_LIMIT = 500;
export const EMAIL_LOG_LIMIT = 100;
const SEARCH_MAX = 80;

export type BookingFilter = {
  statuses?: readonly BookingStatus[];
  refundStatus?: Booking["refund_status"];
  q?: string;
  from?: string | null;
  to?: string | null;
};

export type BookingTab = {
  id: string;
  label: string;
  filter: Pick<BookingFilter, "statuses" | "refundStatus">;
};

export const BOOKING_TABS: readonly BookingTab[] = [
  { id: "all", label: "All", filter: {} },
  { id: "review", label: "Payment review", filter: { statuses: ["payment_review"] } },
  { id: "confirmed", label: "Confirmed", filter: { statuses: ["confirmed"] } },
  { id: "checked-in", label: "Checked in", filter: { statuses: ["checked_in"] } },
  { id: "completed", label: "Completed", filter: { statuses: ["completed"] } },
  { id: "cancelled", label: "Cancelled", filter: { statuses: ["cancelled"] } },
  { id: "refunds", label: "Refunds due", filter: { refundStatus: "due" } },
  { id: "expired-rejected", label: "Expired / Rejected", filter: { statuses: ["expired", "rejected"] } },
];

export type ListParams = { tab: string; q: string; from: string | null; to: string | null };

type RawParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function validDate(raw: string | undefined): string | null {
  if (!raw || !DATE_PATTERN.test(raw)) {
    return null;
  }
  try {
    addDays(raw, 0);
    return raw;
  } catch {
    return null;
  }
}

export function parseListParams(params: RawParams): ListParams {
  const tab = firstParam(params.tab) ?? "all";
  return {
    tab: BOOKING_TABS.some((candidate) => candidate.id === tab) ? tab : "all",
    q: (firstParam(params.q) ?? "").trim().slice(0, SEARCH_MAX),
    from: validDate(firstParam(params.from)),
    to: validDate(firstParam(params.to)),
  };
}

export function bookingsHref(params: Partial<ListParams>): string {
  const query = new URLSearchParams();
  if (params.tab && params.tab !== "all") {
    query.set("tab", params.tab);
  }
  if (params.q) {
    query.set("q", params.q);
  }
  if (params.from) {
    query.set("from", params.from);
  }
  if (params.to) {
    query.set("to", params.to);
  }
  const text = query.toString();
  return text ? `/admin/bookings?${text}` : "/admin/bookings";
}

function likeEscape(value: string): string {
  return value.replace(/[%_]/g, "\\$&");
}

function mobileVariant(term: string): string | null {
  const full = normalizeMobile(term);
  if (full !== null) {
    return full;
  }
  const digits = term.replace(/[\s\-().]/g, "");
  if (/^09\d*$/.test(digits)) {
    return `+63${digits.slice(1)}`;
  }
  if (/^\+?639\d*$/.test(digits)) {
    return digits.startsWith("+") ? digits : `+${digits}`;
  }
  return null;
}

export function searchFilter(raw: string): string | null {
  const term = raw.replace(/[,()"\\*]/g, " ").replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX);
  if (term === "") {
    return null;
  }
  const clauses = ["guest_name", "ref", "email", "mobile"].map((column) => `${column}.ilike.%${likeEscape(term)}%`);
  const mobile = mobileVariant(term);
  if (mobile !== null && mobile !== term) {
    clauses.push(`mobile.ilike.%${likeEscape(mobile)}%`);
  }
  return clauses.join(",");
}

export function arrivingDates(today: string): [string, string] {
  return [today, addDays(today, 1)];
}

function count(amount: number, one: string, many: string): string | null {
  return amount > 0 ? `${amount} ${amount === 1 ? one : many}` : null;
}

export function guestBreakdown(booking: Pick<Booking, "adults" | "seniors" | "kids" | "infants">): string {
  return [
    count(booking.adults, "adult", "adults"),
    count(booking.seniors, "senior", "seniors"),
    count(booking.kids, "kid", "kids"),
    count(booking.infants, "infant", "infants"),
  ]
    .filter((part): part is string => part !== null)
    .join(", ");
}

export function staySummary(booking: Pick<Booking, "kind" | "check_in" | "check_out" | "nights">): string {
  if (booking.kind === "day_tour") {
    return `Day tour on ${formatDayWithYear(booking.check_in)}`;
  }
  const nights = `${booking.nights} ${booking.nights === 1 ? "night" : "nights"}`;
  return `${formatDayWithYear(booking.check_in)} to ${formatDayWithYear(booking.check_out)} (${nights})`;
}

export function priceLines(
  booking: Pick<
    Booking,
    "kind" | "nights" | "adults" | "seniors" | "kids" | "infants" | "tents" | "adult_rate" | "reduced_rate" | "tent_rate"
  >,
): PriceLine[] {
  const settings = {
    ...DEFAULT_SETTINGS,
    overnightAdult: booking.adult_rate,
    overnightReduced: booking.reduced_rate,
    dayAdult: booking.adult_rate,
    dayReduced: booking.reduced_rate,
    tentPrice: booking.tent_rate,
  };
  return priceBooking(booking, settings).lines;
}

export function formatManilaDateTime(iso: string): string {
  const { year, month, day, hour, minute } = manilaNow(new Date(iso));
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${MONTHS[month - 1]} ${day}, ${year}, ${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export type TimelineEntry = { label: string; at: string };

type TimelineSource = Pick<
  Booking,
  | "status"
  | "created_at"
  | "hold_expires_at"
  | "proof_submitted_at"
  | "decided_at"
  | "decided_by"
  | "reject_reason"
  | "checked_in_at"
  | "cancelled_at"
  | "cancelled_by"
  | "refunded_at"
>;

export function buildTimeline(booking: TimelineSource): TimelineEntry[] {
  const entries: TimelineEntry[] = [{ label: "Booking created", at: booking.created_at }];
  if (booking.proof_submitted_at) {
    entries.push({ label: "Payment proof sent", at: booking.proof_submitted_at });
  }
  if (booking.decided_at) {
    const decision = booking.reject_reason ? "Payment rejected" : "Payment confirmed";
    entries.push({ label: booking.decided_by ? `${decision} by ${booking.decided_by}` : decision, at: booking.decided_at });
  }
  if (booking.checked_in_at) {
    entries.push({ label: "Checked in", at: booking.checked_in_at });
  }
  if (booking.cancelled_at) {
    entries.push({ label: `Cancelled by ${booking.cancelled_by ?? "unknown"}`, at: booking.cancelled_at });
  }
  if (booking.refunded_at) {
    entries.push({ label: "Refund sent", at: booking.refunded_at });
  }
  if (booking.status === "expired" && booking.hold_expires_at) {
    entries.push({ label: "Hold expired", at: booking.hold_expires_at });
  }
  return entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export const EMAIL_KIND_LABELS: Record<EmailKind, string> = {
  proof_received: "Proof received (to guest)",
  confirmed: "Booking confirmed (to guest)",
  rejected: "Payment rejected (to guest)",
  cancelled: "Booking cancelled (to guest)",
  refund_sent: "Refund sent (to guest)",
  admin_new_proof: "New payment to verify (to admins)",
  admin_guest_cancelled: "Guest cancelled (to admins)",
  admin_inquiry: "New inquiry (to admins)",
};

export type EmailLogRow = {
  id: string;
  kind: EmailKind;
  booking_id: string | null;
  inquiry_id: string | null;
  recipient: string;
  subject: string;
  body: string;
  status: "sent" | "failed" | "resent";
  error: string | null;
  created_at: string;
};

export type EmailHistoryRow = Omit<EmailLogRow, "body">;

export type EmailEntry = Pick<EmailLogRow, "kind" | "booking_id" | "inquiry_id" | "recipient" | "status" | "created_at">;

export type EmailLogEntry = EmailLogRow & { resendable: boolean };

export function needsResend(row: EmailEntry, all: readonly EmailEntry[]): boolean {
  return (
    row.status === "failed" &&
    !all.some(
      (other) =>
        other.status !== "failed" &&
        other.kind === row.kind &&
        other.recipient === row.recipient &&
        other.booking_id === row.booking_id &&
        other.inquiry_id === row.inquiry_id &&
        Date.parse(other.created_at) > Date.parse(row.created_at),
    )
  );
}

const ENDED_STATUSES: readonly BookingStatus[] = ["cancelled", "rejected", "expired"];
const STAYING_STATUSES: readonly BookingStatus[] = ["confirmed", "checked_in", "completed"];

export function emailRelevant(kind: EmailKind, booking: Pick<Booking, "status" | "refund_status"> | null): boolean {
  if (booking === null) {
    return true;
  }
  switch (kind) {
    case "confirmed":
      return STAYING_STATUSES.includes(booking.status);
    case "cancelled":
      return booking.status === "cancelled";
    case "rejected":
      return booking.status === "rejected";
    case "proof_received":
    case "admin_new_proof":
      return !ENDED_STATUSES.includes(booking.status);
    case "refund_sent":
      return booking.refund_status === "sent";
    default:
      return true;
  }
}

export async function listBookings(filter: BookingFilter): Promise<{ rows: Booking[]; capped: boolean }> {
  let query = db().from("bookings").select("*");
  if (filter.statuses) {
    query = query.in("status", [...filter.statuses]);
  }
  if (filter.refundStatus) {
    query = query.eq("refund_status", filter.refundStatus);
  }
  if (filter.from) {
    query = query.gte("check_in", filter.from);
  }
  if (filter.to) {
    query = query.lte("check_in", filter.to);
  }
  const search = filter.q ? searchFilter(filter.q) : null;
  if (search) {
    query = query.or(search);
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(BOOKING_LIMIT + 1)
    .overrideTypes<Booking[], { merge: false }>();
  if (error) {
    throw new Error(`booking list failed: ${error.message}`);
  }
  return { rows: data.slice(0, BOOKING_LIMIT), capped: data.length > BOOKING_LIMIT };
}

export async function listPaymentReview(): Promise<Booking[]> {
  const { data, error } = await db()
    .from("bookings")
    .select("*")
    .eq("status", "payment_review")
    .order("proof_submitted_at", { ascending: true })
    .order("created_at", { ascending: true })
    .overrideTypes<Booking[], { merge: false }>();
  if (error) {
    throw new Error(`payment list failed: ${error.message}`);
  }
  return data;
}

export async function listArriving(today: string): Promise<Booking[]> {
  const { data, error } = await db()
    .from("bookings")
    .select("*")
    .eq("status", "confirmed")
    .in("check_in", arrivingDates(today))
    .order("check_in", { ascending: true })
    .order("guest_name", { ascending: true })
    .overrideTypes<Booking[], { merge: false }>();
  if (error) {
    throw new Error(`arrivals list failed: ${error.message}`);
  }
  return data;
}

export async function getBooking(id: string): Promise<Booking | null> {
  if (!isUuid(id)) {
    return null;
  }
  const { data, error } = await db().from("bookings").select("*").eq("id", id).maybeSingle<Booking>();
  if (error) {
    throw new Error(`booking lookup failed: ${error.message}`);
  }
  return data;
}

export async function bookingEmails(bookingId: string): Promise<EmailHistoryRow[]> {
  const { data, error } = await db()
    .from("email_log")
    .select("id, kind, booking_id, inquiry_id, recipient, subject, status, error, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .overrideTypes<EmailHistoryRow[], { merge: false }>();
  if (error) {
    throw new Error(`email history failed: ${error.message}`);
  }
  return data;
}

const EMAIL_ENTRY_COLUMNS = "kind, booking_id, inquiry_id, recipient, status, created_at";

export async function getEmailLogRow(id: string): Promise<EmailLogRow | null> {
  const { data, error } = await db().from("email_log").select("*").eq("id", id).maybeSingle<EmailLogRow>();
  if (error) {
    throw new Error(`email lookup failed: ${error.message}`);
  }
  return data;
}

export async function emailSiblings(row: EmailLogRow): Promise<EmailEntry[]> {
  let query = db().from("email_log").select(EMAIL_ENTRY_COLUMNS).eq("kind", row.kind).eq("recipient", row.recipient);
  query = row.booking_id ? query.eq("booking_id", row.booking_id) : query.is("booking_id", null);
  query = row.inquiry_id ? query.eq("inquiry_id", row.inquiry_id) : query.is("inquiry_id", null);
  const { data, error } = await query.overrideTypes<EmailEntry[], { merge: false }>();
  if (error) {
    throw new Error(`email siblings failed: ${error.message}`);
  }
  return data;
}

async function sentSince(createdAt: string): Promise<EmailEntry[]> {
  const { data, error } = await db()
    .from("email_log")
    .select(EMAIL_ENTRY_COLUMNS)
    .neq("status", "failed")
    .gte("created_at", createdAt)
    .overrideTypes<EmailEntry[], { merge: false }>();
  if (error) {
    throw new Error(`email log failed: ${error.message}`);
  }
  return data;
}

export async function listEmailLog(failedOnly: boolean): Promise<{ rows: EmailLogEntry[]; capped: boolean }> {
  let query = db().from("email_log").select("*");
  if (failedOnly) {
    query = query.eq("status", "failed");
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(EMAIL_LOG_LIMIT + 1)
    .overrideTypes<EmailLogRow[], { merge: false }>();
  if (error) {
    throw new Error(`email log failed: ${error.message}`);
  }
  const rows = data.slice(0, EMAIL_LOG_LIMIT);
  const oldest = rows.at(-1)?.created_at;
  const pool: readonly EmailEntry[] = failedOnly && oldest ? [...rows, ...(await sentSince(oldest))] : rows;
  return {
    rows: rows.map((row) => ({ ...row, resendable: needsResend(row, pool) })),
    capped: data.length > EMAIL_LOG_LIMIT,
  };
}

export type BookingPatch = Partial<Omit<Booking, "id" | "status">>;

export async function transition(
  id: string,
  from: BookingStatus,
  to: BookingStatus,
  patch: BookingPatch = {},
): Promise<Booking | null> {
  const { data, error } = await db()
    .from("bookings")
    .update({ ...patch, status: to })
    .eq("id", id)
    .eq("status", from)
    .select("*")
    .overrideTypes<Booking[], { merge: false }>();
  if (error) {
    throw new Error(`booking update failed: ${error.message}`);
  }
  return data[0] ?? null;
}

export async function releaseBooking(
  id: string,
  expected: readonly BookingStatus[],
  status: BookingStatus,
): Promise<BookingStatus | null> {
  const { data, error } = await db().rpc("release_booking", {
    p_id: id,
    p_expected: [...expected],
    p_new_status: status,
  });
  if (error) {
    throw new Error(`release_booking failed: ${error.message}`);
  }
  return (data as BookingStatus | null) ?? null;
}
