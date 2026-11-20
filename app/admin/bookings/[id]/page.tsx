import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/copy-button";
import { InfoCallout } from "@/components/info-callout";
import { ProofViewer } from "@/components/proof-viewer";
import { StatusBadge } from "@/components/status-badge";
import {
  bookingEmails,
  buildTimeline,
  EMAIL_KIND_LABELS,
  emailRelevant,
  formatManilaDateTime,
  getBooking,
  guestBreakdown,
  needsResend,
  priceLines,
  staySummary,
} from "@/lib/admin";
import { bookingSlotLabels } from "@/lib/bookings";
import { signedProofUrl } from "@/lib/proofs";
import { formatPeso, manilaToday } from "@/lib/rules";
import { requireAdmin } from "@/lib/supabase";
import { emailErrorText, EmailStatus } from "../../email-log/email-status";
import { ResendButton } from "../../email-log/resend-button";
import { BookingActions } from "./booking-actions";

export const metadata: Metadata = { title: "Booking" };

type BookingDetailProps = {
  params: Promise<{ id: string }>;
};

const REFUND_LABELS = { none: "None", due: "Refund due", sent: "Refund sent" } as const;

function Panel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium sm:text-right">{children}</dd>
    </div>
  );
}

function MoneyRow({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatPeso(amount)}</dd>
    </div>
  );
}

export default async function BookingDetailPage({ params }: BookingDetailProps) {
  await requireAdmin();
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) {
    notFound();
  }
  const [slots, emails, proofUrl] = await Promise.all([
    bookingSlotLabels(booking),
    bookingEmails(booking.id),
    booking.proof_path ? signedProofUrl(booking.proof_path) : Promise.resolve(null),
  ]);
  const timeline = buildTimeline(booking);
  const lines = priceLines(booking);
  const overnight = booking.kind === "overnight";
  const unsent = emails.filter((email) => needsResend(email, emails) && emailRelevant(email.kind, booking));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/bookings" className="inline-flex min-h-11 items-center font-bold text-moss-strong underline">
        Back to bookings
      </Link>

      <div className="flex flex-col items-start gap-3">
        <StatusBadge status={booking.status} />
        <h1 className="tabular-nums">{booking.ref}</h1>
        <p className="text-ink-muted">{booking.guest_name}</p>
      </div>

      {unsent.length > 0 ? (
        <InfoCallout title="An email could not be sent">
          <p>
            {unsent.length === 1 ? "One email" : `${unsent.length} emails`} for this booking failed. The action itself was
            saved.{" "}
            <a href="#emails-title" className="font-bold text-moss-strong underline">
              Go to the Emails section
            </a>{" "}
            to resend.
          </p>
        </InfoCallout>
      ) : null}

      <BookingActions booking={booking} today={manilaToday()} />

      <Panel id="guest-title" title="Guest">
        <dl className="divide-y divide-line">
          <Row label="Name">{booking.guest_name}</Row>
          <Row label="Email">
            <a href={`mailto:${booking.email}`} className="underline">
              {booking.email}
            </a>
          </Row>
          <Row label="Mobile">
            <a href={`tel:${booking.mobile}`} className="tabular-nums underline">
              {booking.mobile}
            </a>
          </Row>
          {booking.notes ? <Row label="Notes">{booking.notes}</Row> : null}
        </dl>
      </Panel>

      <Panel id="stay-title" title="Stay">
        <dl className="divide-y divide-line">
          <Row label="Type">{overnight ? "Overnight stay" : "Day tour"}</Row>
          <Row label="Dates">{staySummary(booking)}</Row>
          {overnight ? <Row label="Slots">{slots.join(", ")}</Row> : null}
          <Row label="Guests">
            {booking.guests} ({guestBreakdown(booking)})
          </Row>
          {overnight ? <Row label="Tents">{booking.tents}</Row> : null}
        </dl>
      </Panel>

      <Panel id="price-title" title="Price">
        <dl className="flex flex-col gap-1">
          {lines.map((line) => (
            <div key={line.label} className="flex justify-between gap-4 text-ink-muted">
              <dt>
                {line.label}: {line.quantity} × {formatPeso(line.unitPrice)}
              </dt>
              <dd className="tabular-nums">{formatPeso(line.amount)}</dd>
            </div>
          ))}
        </dl>
        <dl className="flex flex-col gap-1 border-t border-line pt-3">
          <MoneyRow label="Total" amount={booking.total} />
          <MoneyRow label="Downpayment" amount={booking.downpayment} strong />
          <MoneyRow label="Balance at check-in" amount={booking.balance} />
        </dl>
      </Panel>

      <Panel id="payment-title" title="Payment">
        <dl className="divide-y divide-line">
          <Row label="GCash reference">
            {booking.gcash_ref ? (
              <span className="flex flex-wrap items-center gap-3 sm:justify-end">
                <span className="font-mono tabular-nums">{booking.gcash_ref}</span>
                <CopyButton text={booking.gcash_ref} />
              </span>
            ) : (
              "None"
            )}
          </Row>
          {booking.proof_submitted_at ? <Row label="Proof sent">{formatManilaDateTime(booking.proof_submitted_at)}</Row> : null}
          {booking.reject_reason ? <Row label="Rejection reason">{booking.reject_reason}</Row> : null}
          {booking.balance_collected !== null ? (
            <Row label="Balance collected">
              <span className="tabular-nums">{formatPeso(booking.balance_collected)}</span>
            </Row>
          ) : null}
          {booking.deposit_amount !== null ? (
            <Row label="Security deposit">
              {booking.deposit_amount === 0 ? (
                "No deposit"
              ) : (
                <>
                  <span className="tabular-nums">{formatPeso(booking.deposit_amount)}</span>
                  {booking.deposit_returned === null ? null : booking.deposit_returned ? " · returned" : " · not returned"}
                </>
              )}
            </Row>
          ) : null}
          {booking.cancel_reason ? <Row label="Cancellation reason">{booking.cancel_reason}</Row> : null}
          {booking.refund_status !== "none" || booking.refund_ref ? (
            <Row label="Refund">
              {REFUND_LABELS[booking.refund_status]}
              {booking.refund_ref ? <span className="font-mono tabular-nums"> · {booking.refund_ref}</span> : null}
              {booking.refunded_at ? ` · ${formatManilaDateTime(booking.refunded_at)}` : null}
            </Row>
          ) : null}
        </dl>
        {booking.proof_path ? <ProofViewer url={proofUrl} alt={`GCash screenshot for ${booking.ref}`} /> : null}
      </Panel>

      <Panel id="timeline-title" title="Timeline">
        <ol className="flex flex-col gap-2">
          {timeline.map((entry) => (
            <li key={`${entry.label}-${entry.at}`} className="flex flex-col sm:flex-row sm:justify-between sm:gap-6">
              <span className="font-medium">{entry.label}</span>
              <span className="text-ink-muted">{formatManilaDateTime(entry.at)}</span>
            </li>
          ))}
        </ol>
        <p className="text-small text-ink-muted">All times are Manila time.</p>
      </Panel>

      <Panel id="emails-title" title="Emails">
        {emails.length === 0 ? (
          <p className="text-ink-muted">No emails have been sent for this booking.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {emails.map((email) => {
              const error = emailErrorText(email.error);
              return (
                <li key={email.id} className="flex flex-col gap-2 border-b border-line pb-4 last:border-b-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{EMAIL_KIND_LABELS[email.kind] ?? email.kind}</span>
                    <EmailStatus status={email.status} />
                  </div>
                  <p className="text-small text-ink-muted">
                    {formatManilaDateTime(email.created_at)} · To {email.recipient}
                  </p>
                  {error ? <p className="text-small font-medium text-danger">{error}</p> : null}
                  {needsResend(email, emails) ? (
                    emailRelevant(email.kind, booking) ? (
                      <ResendButton emailId={email.id} />
                    ) : (
                      <p className="text-small text-ink-muted">No longer relevant, so it cannot be resent.</p>
                    )
                  ) : null}
                  {email.status === "failed" && !needsResend(email, emails) ? (
                    <p className="text-small text-ink-muted">Already resent.</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-small">
          <Link href="/admin/email-log" className="font-bold text-moss-strong underline">
            Open the full Email log
          </Link>
        </p>
      </Panel>
    </div>
  );
}
