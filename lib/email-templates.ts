import { cancellationSummary, houseRules, site, stayTimes, whatToBring } from "./content.ts";
import { formatPeso } from "./rules.ts";
import type { Booking } from "./supabase.ts";

export type EmailContext = {
  siteUrl: string;
  slotLabels: readonly string[];
  depositNote: string;
  contact?: readonly string[];
};

export type Composed = { subject: string; body: string };

export type InquiryEmail = {
  id?: string | number;
  name: string;
  email: string;
  mobile?: string | null;
  type?: string | null;
  preferred_date?: string | null;
  guests?: number | null;
  message: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: string): string {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function stayLine(b: Booking): string {
  if (b.kind === "day_tour") {
    return `Day tour: ${formatDate(b.check_in)}, ${stayTimes.dayTour}`;
  }
  return `Stay: ${formatDate(b.check_in)} to ${formatDate(b.check_out)} (${plural(b.nights, "night")})`;
}

function detailLines(b: Booking, ctx: EmailContext): string[] {
  const lines = [`Booking: ${b.ref}`, stayLine(b)];
  if (b.kind === "overnight") {
    lines.push(`Slots: ${ctx.slotLabels.join(", ")}`);
  }
  lines.push(`Guests: ${b.guests}`);
  if (b.tents > 0) {
    lines.push(`Rented tents: ${b.tents}`);
  }
  return lines;
}

function bookingUrl(b: Booking, ctx: EmailContext): string {
  return `${ctx.siteUrl}/b/${b.access_token}`;
}

function adminUrl(b: Booking, ctx: EmailContext): string {
  return `${ctx.siteUrl}/admin/bookings/${b.id}`;
}

function guestEmail(subject: string, paragraphs: readonly string[], b: Booking, ctx: EmailContext): Composed {
  const footer = [
    ...(ctx.contact && ctx.contact.length > 0 ? [`Questions? ${ctx.contact.join(" or ")}`, ""] : []),
    `Your booking: ${bookingUrl(b, ctx)}`,
    `Facebook: ${site.facebookUrl}`,
    "",
    `${site.name} · ${site.address}`,
  ];
  return { subject, body: [`Hi ${b.guest_name},`, "", ...paragraphs, "", ...footer].join("\n") };
}

function bullets(items: readonly string[]): string[] {
  return items.map((item) => `- ${item}`);
}

export function composeProofReceived(b: Booking, ctx: EmailContext): Composed {
  return guestEmail(
    `We received your payment proof (${b.ref})`,
    [
      "Thank you. We received your GCash payment details and will check them shortly.",
      "",
      ...detailLines(b, ctx),
      `Downpayment sent: ${formatPeso(b.downpayment)}`,
      ...(b.gcash_ref ? [`GCash reference: ${b.gcash_ref}`] : []),
      "",
      "We will email you as soon as your booking is confirmed. Your slots stay held while we check.",
    ],
    b,
    ctx,
  );
}

export function composeConfirmed(b: Booking, ctx: EmailContext): Composed {
  const times = b.kind === "day_tour" ? [] : [`Check-in: ${stayTimes.checkIn}`, `Check-out: ${stayTimes.checkOut}`, ""];
  return guestEmail(
    `Booking confirmed: ${b.ref}, ${formatDate(b.check_in)}`,
    [
      "Your booking is confirmed. We look forward to seeing you at the river.",
      "",
      ...detailLines(b, ctx),
      "",
      `Downpayment paid: ${formatPeso(b.downpayment)}`,
      `Balance due at check-in: ${formatPeso(b.balance)}`,
      `Security deposit: ${ctx.depositNote}`,
      "",
      ...times,
      "House rules:",
      ...bullets(houseRules.map((rule) => `${rule.title}. ${rule.detail}`)),
      "",
      "What to bring:",
      ...bullets(whatToBring),
      "",
      `Map: ${site.mapUrl}`,
      "",
      "Cancellation:",
      ...bullets(cancellationSummary),
    ],
    b,
    ctx,
  );
}

export function composeRejected(b: Booking, ctx: EmailContext): Composed {
  return guestEmail(
    `Your payment could not be verified (${b.ref})`,
    [
      "We could not confirm your payment, so your booking was not confirmed and the slots were released.",
      "",
      `Reason: ${b.reject_reason ?? "Not given"}`,
      "",
      ...detailLines(b, ctx),
      "",
      "If you did send a payment, we will refund it by GCash and email you when it is sent.",
      "You are welcome to book again, or message us on Facebook if you have questions.",
    ],
    b,
    ctx,
  );
}

export function composeCancelled(b: Booking, ctx: EmailContext): Composed {
  const by = b.cancelled_by === "guest" ? "at your request" : "by The Rio";
  const refund =
    b.refund_status === "none"
      ? "No payment was received, so there is nothing to refund."
      : `A full refund of ${formatPeso(b.downpayment)} will be sent to you by GCash. We will email you when it is sent.`;
  return guestEmail(
    `Booking cancelled (${b.ref})`,
    [
      `Your booking was cancelled ${by}.`,
      ...(b.cancel_reason ? ["", `Reason: ${b.cancel_reason}`] : []),
      "",
      ...detailLines(b, ctx),
      "",
      refund,
    ],
    b,
    ctx,
  );
}

export function composeRefundSent(b: Booking, ctx: EmailContext): Composed {
  return guestEmail(
    `Your refund was sent (${b.ref})`,
    [
      `We sent your refund of ${formatPeso(b.downpayment)} by GCash.`,
      ...(b.refund_ref ? [`GCash reference: ${b.refund_ref}`] : []),
      "",
      ...detailLines(b, ctx),
      "",
      "It should show in your GCash account shortly. Message us on Facebook if it does not.",
    ],
    b,
    ctx,
  );
}

export function composeAdminNewProof(b: Booking, ctx: EmailContext): Composed {
  return {
    subject: `Payment to verify: ${b.ref}`,
    body: [
      "A payment proof is waiting for review.",
      "",
      `Booking: ${b.ref}`,
      stayLine(b),
      `Downpayment: ${formatPeso(b.downpayment)}`,
      ...(b.gcash_ref ? [`GCash reference: ${b.gcash_ref}`] : []),
      "",
      `Review it: ${adminUrl(b, ctx)}`,
    ].join("\n"),
  };
}

export function composeAdminGuestCancelled(b: Booking, ctx: EmailContext): Composed {
  const refund =
    b.refund_status === "due"
      ? `Refund needed: ${formatPeso(b.downpayment)} by GCash.`
      : "No refund needed: no payment was received.";
  return {
    subject: `Guest cancelled: ${b.ref}`,
    body: [
      "A guest cancelled their booking.",
      "",
      `Booking: ${b.ref}`,
      stayLine(b),
      refund,
      "",
      `Open it: ${adminUrl(b, ctx)}`,
    ].join("\n"),
  };
}

export function composeAdminInquiry(q: InquiryEmail, siteUrl: string): Composed {
  const fields: [string, string | number | null | undefined][] = [
    ["Name", q.name],
    ["Email", q.email],
    ["Mobile", q.mobile],
    ["Type", q.type],
    ["Preferred date", q.preferred_date],
    ["Guests", q.guests],
  ];
  return {
    subject: "New event inquiry",
    body: [
      "Someone sent an event inquiry.",
      "",
      ...fields.flatMap(([label, value]) => (value === null || value === undefined || value === "" ? [] : [`${label}: ${value}`])),
      "",
      "Message:",
      q.message,
      "",
      `Inquiries: ${siteUrl}/admin/inquiries`,
    ].join("\n"),
  };
}
