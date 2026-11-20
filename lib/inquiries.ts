import { site } from "./content.ts";
import { addDays, type InquiryValues } from "./rules.ts";
import { db, type Inquiry, type InquiryStatus } from "./supabase.ts";

export const INQUIRY_LIMIT = 500;
const NEW_LIMIT = 2000;
export const INQUIRY_NOTE_MAX = 1000;

const STATUS_ORDER: readonly InquiryStatus[] = ["new", "replied", "closed"];

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  replied: "Replied",
  closed: "Closed",
};

export function isInquiryStatus(value: unknown): value is InquiryStatus {
  return typeof value === "string" && STATUS_ORDER.some((status) => status === value);
}

const TRANSITIONS: Record<InquiryStatus, readonly InquiryStatus[]> = {
  new: ["replied", "closed"],
  replied: ["closed", "new"],
  closed: ["new"],
};

export function nextStatuses(status: InquiryStatus): readonly InquiryStatus[] {
  return TRANSITIONS[status];
}

export function canTransition(from: InquiryStatus, to: InquiryStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function inquiryStatusLabel(status: InquiryStatus): string {
  return STATUS_LABELS[status];
}

export function sortInquiries<T extends Pick<Inquiry, "status" | "created_at">>(rows: readonly T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
      Date.parse(b.created_at) - Date.parse(a.created_at),
  );
}

export function countNew(rows: readonly Pick<Inquiry, "status">[]): number {
  return rows.filter((row) => row.status === "new").length;
}

export function manilaDayRange(today: string): { start: string; end: string } {
  return { start: `${today}T00:00:00+08:00`, end: `${addDays(today, 1)}T00:00:00+08:00` };
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function topic(type: Inquiry["type"]): string {
  return type === "Other" ? "your inquiry" : `your ${type.toLowerCase()} inquiry`;
}

export function replySubject(): string {
  return `Your inquiry to ${site.name}`;
}

export function replyBody(inquiry: Pick<Inquiry, "name" | "type">): string {
  return `Hi ${firstName(inquiry.name)},\n\nThank you for ${topic(inquiry.type)} at ${site.name}.\n\n`;
}

export function mailtoLink(inquiry: Pick<Inquiry, "name" | "email" | "type">): string {
  const query = `subject=${encodeURIComponent(replySubject())}&body=${encodeURIComponent(replyBody(inquiry))}`;
  return `mailto:${encodeURIComponent(inquiry.email).replace("%40", "@")}?${query}`;
}

export function smsLink(inquiry: Pick<Inquiry, "name" | "mobile" | "type">): string {
  const text = `Hi ${firstName(inquiry.name)}, this is ${site.name}. Thank you for ${topic(inquiry.type)}. `;
  return `sms:${inquiry.mobile.replace(/[^\d+]/g, "")}?body=${encodeURIComponent(text)}`;
}

export async function countInquiriesFromEmail(email: string, today: string): Promise<number> {
  const { start, end } = manilaDayRange(today);
  const { count, error } = await db()
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("email", email.trim().toLowerCase())
    .gte("created_at", start)
    .lt("created_at", end);
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

export async function insertInquiry(values: InquiryValues): Promise<string> {
  const { data, error } = await db().from("inquiries").insert(values).select("id").single<{ id: string }>();
  if (error) {
    throw new Error(error.message);
  }
  return data.id;
}

export async function listInquiries(): Promise<{ rows: Inquiry[]; capped: boolean }> {
  const client = db();
  const [fresh, handled] = await Promise.all([
    client
      .from("inquiries")
      .select("*")
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(NEW_LIMIT)
      .returns<Inquiry[]>(),
    client
      .from("inquiries")
      .select("*")
      .in("status", ["replied", "closed"])
      .order("created_at", { ascending: false })
      .limit(INQUIRY_LIMIT)
      .returns<Inquiry[]>(),
  ]);
  const failure = fresh.error ?? handled.error;
  if (failure) {
    throw new Error(failure.message);
  }
  const handledRows = handled.data ?? [];
  return { rows: sortInquiries([...(fresh.data ?? []), ...handledRows]), capped: handledRows.length === INQUIRY_LIMIT };
}

export async function changeInquiryStatus(id: string, expected: InquiryStatus, next: InquiryStatus): Promise<boolean> {
  const { data, error } = await db()
    .from("inquiries")
    .update({ status: next })
    .eq("id", id)
    .eq("status", expected)
    .select("id");
  if (error) {
    throw new Error(error.message);
  }
  return (data?.length ?? 0) > 0;
}

export async function saveInquiryNote(id: string, note: string): Promise<boolean> {
  const { data, error } = await db().from("inquiries").update({ admin_note: note }).eq("id", id).select("id");
  if (error) {
    throw new Error(error.message);
  }
  return (data?.length ?? 0) > 0;
}
