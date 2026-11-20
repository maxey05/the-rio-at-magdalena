import nodemailer from "nodemailer";
import {
  composeAdminGuestCancelled,
  composeAdminInquiry,
  composeAdminNewProof,
  composeCancelled,
  composeConfirmed,
  composeProofReceived,
  composeRefundSent,
  composeRejected,
  type Composed,
  type EmailContext,
  type InquiryEmail,
} from "./email-templates.ts";
import { db, requireEnv, type Booking, type Camp, type Slot } from "./supabase.ts";

export type EmailResult = { ok: boolean; error?: string };

export type EmailKind =
  | "proof_received"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "refund_sent"
  | "admin_new_proof"
  | "admin_guest_cancelled"
  | "admin_inquiry";

type Refs = { bookingId?: string | null; inquiryId?: string | null };

type LogRow = {
  kind: EmailKind;
  booking_id: string | null;
  inquiry_id: string | null;
  recipient: string;
  subject: string;
  body: string;
};

const TIMEOUT_MS = 10_000;

function transport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: requireEnv("GMAIL_USER"), pass: requireEnv("GMAIL_APP_PASSWORD") },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function adminRecipients(): string {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean)
    .join(", ");
}

async function send(
  kind: EmailKind,
  to: string,
  subject: string,
  body: string,
  refs: Refs,
  okStatus: "sent" | "resent" = "sent",
): Promise<EmailResult> {
  let status: "sent" | "resent" | "failed" = okStatus;
  let error: string | null = null;
  try {
    if (!process.env.GMAIL_USER && process.env.SITE_ENV !== "production") {
      console.log(`[email dev-preview] ${kind}\nTo: ${to}\nSubject: ${subject}\n\n${body}\n`);
      error = "dev-preview";
    } else if (!to) {
      throw new Error("No recipient");
    } else {
      await transport().sendMail({
        from: `The Rio At Magdalena <${process.env.GMAIL_USER}>`,
        to,
        subject,
        text: body,
      });
    }
  } catch (caught) {
    status = "failed";
    error = message(caught);
  }

  try {
    const { error: logError } = await db()
      .from("email_log")
      .insert({
        kind,
        booking_id: refs.bookingId ?? null,
        inquiry_id: refs.inquiryId ?? null,
        recipient: to || "(none)",
        subject,
        body,
        status,
        error,
      });
    if (logError) {
      console.error("email_log insert failed", logError.message);
    }
  } catch (caught) {
    console.error("email_log insert failed", message(caught));
  }

  return status === "failed" ? { ok: false, error: error ?? "Send failed" } : { ok: true };
}

async function loadContext(booking: Booking): Promise<EmailContext> {
  const client = db();
  const { data: settings } = await client
    .from("settings")
    .select("deposit_note, contact_phone, contact_email")
    .maybeSingle<{ deposit_note: string; contact_phone: string | null; contact_email: string | null }>();

  let slotLabels: string[] = [];
  if (booking.slot_ids.length > 0) {
    const [{ data: slots }, { data: camps }] = await Promise.all([
      client.from("slots").select("id, camp_id, code, sort").in("id", booking.slot_ids).returns<Pick<Slot, "id" | "camp_id" | "code" | "sort">[]>(),
      client.from("camps").select("id, name, sort").returns<Pick<Camp, "id" | "name" | "sort">[]>(),
    ]);
    const campById = new Map((camps ?? []).map((camp) => [camp.id, camp]));
    slotLabels = (slots ?? [])
      .map((slot) => ({ slot, camp: campById.get(slot.camp_id) }))
      .sort((a, b) => (a.camp?.sort ?? 0) - (b.camp?.sort ?? 0) || a.slot.sort - b.slot.sort)
      .map(({ slot, camp }) => `${camp?.name ?? "Camp"} Slot ${slot.code}`);
  }

  return {
    siteUrl: requireEnv("SITE_URL").replace(/\/+$/, ""),
    slotLabels,
    depositNote: settings?.deposit_note ?? "Amount confirmed at check-in",
    contact: [settings?.contact_phone, settings?.contact_email].filter((value): value is string => Boolean(value)),
  };
}

async function sendBooking(
  kind: EmailKind,
  booking: Booking,
  compose: (booking: Booking, ctx: EmailContext) => Composed,
  to: (booking: Booking) => string,
): Promise<EmailResult> {
  try {
    const { subject, body } = compose(booking, await loadContext(booking));
    return await send(kind, to(booking), subject, body, { bookingId: booking.id });
  } catch (caught) {
    return { ok: false, error: message(caught) };
  }
}

const toGuest = (booking: Booking) => booking.email;

export const sendProofReceived = (booking: Booking) => sendBooking("proof_received", booking, composeProofReceived, toGuest);
export const sendConfirmed = (booking: Booking) => sendBooking("confirmed", booking, composeConfirmed, toGuest);
export const sendRejected = (booking: Booking) => sendBooking("rejected", booking, composeRejected, toGuest);
export const sendCancelled = (booking: Booking) => sendBooking("cancelled", booking, composeCancelled, toGuest);
export const sendRefundSent = (booking: Booking) => sendBooking("refund_sent", booking, composeRefundSent, toGuest);
export const sendAdminNewProof = (booking: Booking) =>
  sendBooking("admin_new_proof", booking, composeAdminNewProof, adminRecipients);
export const sendAdminGuestCancelled = (booking: Booking) =>
  sendBooking("admin_guest_cancelled", booking, composeAdminGuestCancelled, adminRecipients);

export async function sendAdminInquiry(inquiry: InquiryEmail): Promise<EmailResult> {
  try {
    const { subject, body } = composeAdminInquiry(inquiry, (process.env.SITE_URL ?? "[SITE_URL is not set]").replace(/\/+$/, ""));
    const inquiryId = inquiry.id === undefined ? null : String(inquiry.id);
    return await send("admin_inquiry", adminRecipients(), subject, body, { inquiryId });
  } catch (caught) {
    return { ok: false, error: message(caught) };
  }
}

export async function resendLoggedEmail(id: string): Promise<EmailResult> {
  try {
    const { data, error } = await db().from("email_log").select("*").eq("id", id).maybeSingle<LogRow>();
    if (error || !data) {
      return { ok: false, error: error?.message ?? "Email not found" };
    }
    return await send(
      data.kind,
      data.recipient,
      data.subject,
      data.body,
      { bookingId: data.booking_id, inquiryId: data.inquiry_id },
      "resent",
    );
  } catch (caught) {
    return { ok: false, error: message(caught) };
  }
}
