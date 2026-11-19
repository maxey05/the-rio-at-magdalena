import Image from "next/image";
import type { ReactNode } from "react";
import { Button } from "@/components/button";
import { CheckIcon } from "@/components/icons";
import { InfoCallout } from "@/components/info-callout";
import { MessengerButton } from "@/components/messenger-button";
import { CopyButton } from "@/components/copy-button";
import { Countdown } from "@/components/countdown";
import { stayTimes, whatToBring } from "@/lib/content";
import { holdIsOpen, MAX_PROOF_BYTES, signedQrUrl } from "@/lib/proofs";
import { formatPeso, manilaNow, statusLabel } from "@/lib/rules";
import { getPaymentDetails } from "@/lib/settings";
import type { Booking } from "@/lib/supabase";
import { ProofForm } from "./proof-form";

type StatusSectionProps = {
  booking: Booking;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatManilaTime(iso: string): string {
  const { year, month, day, hour, minute } = manilaNow(new Date(iso));
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${MONTHS[month - 1]} ${day}, ${year}, ${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function bookAgainHref(booking: Booking): string {
  const params = new URLSearchParams({
    type: booking.kind,
    in: booking.check_in,
    n: String(booking.nights),
    slots: booking.slot_ids.join(","),
  });
  return `/book?${params.toString()}`;
}

function Panel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 md:p-8">
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

async function AwaitingPayment({ booking }: StatusSectionProps) {
  const details = await getPaymentDetails();
  const qrUrl = details.gcashQrPath ? await signedQrUrl(details.gcashQrPath) : null;
  const ready = details.gcashName !== null && details.gcashNumber !== null && qrUrl !== null;

  return (
    <div className="flex flex-col gap-6">
      {booking.hold_expires_at ? <Countdown expiresAt={booking.hold_expires_at} /> : null}
      {ready ? (
        <>
          <Panel id="pay-title" title="Pay with GCash">
            <p>
              Send <strong className="tabular-nums">{formatPeso(booking.downpayment)}</strong> to hold your booking. The
              rest, {formatPeso(booking.balance)}, is paid at check-in.
            </p>
            <dl className="flex flex-col gap-4 rounded-input bg-moss-soft p-4">
              <div>
                <dt className="text-small text-ink-muted">GCash account name</dt>
                <dd className="font-bold">{details.gcashName}</dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <dt className="text-small text-ink-muted">GCash number</dt>
                  <dd className="font-bold tabular-nums">{details.gcashNumber}</dd>
                </div>
                <CopyButton text={details.gcashNumber ?? ""} />
              </div>
            </dl>
            <div className="flex justify-center">
              <Image
                src={qrUrl}
                alt={`GCash QR code for ${details.gcashName}`}
                width={240}
                height={240}
                unoptimized
                className="h-60 w-60 rounded-input border border-line bg-surface object-contain"
              />
            </div>
            <ol className="flex list-decimal flex-col gap-2 pl-6">
              <li>Open GCash and choose Send Money, or scan the QR code.</li>
              <li>Send exactly {formatPeso(booking.downpayment)}.</li>
              <li>Save the receipt, then enter its 13-digit reference number and upload a screenshot below.</li>
            </ol>
          </Panel>
          <Panel id="proof-title" title="Send your payment proof">
            <ProofForm token={booking.access_token} maxBytes={MAX_PROOF_BYTES} />
          </Panel>
        </>
      ) : (
        <Panel id="pay-title" title="Pay with GCash">
          <InfoCallout>
            <p>Payment details are being set up — please message us.</p>
          </InfoCallout>
          <div>
            <MessengerButton />
          </div>
        </Panel>
      )}
    </div>
  );
}

function PaymentReview({ booking }: StatusSectionProps) {
  const lastFour = booking.gcash_ref ? booking.gcash_ref.slice(-4) : null;
  return (
    <Panel id="review-title" title="We're checking your payment">
      <p>Thanks! We received your payment proof and will confirm your booking by email once we have checked it.</p>
      <ul className="flex flex-col gap-1 text-ink-muted">
        {lastFour ? <li>GCash reference ending in {lastFour}</li> : null}
        {booking.proof_submitted_at ? <li>Sent {formatManilaTime(booking.proof_submitted_at)} (Manila time)</li> : null}
      </ul>
      <p>Your slots stay held while we check.</p>
    </Panel>
  );
}

function Confirmed({ booking }: StatusSectionProps) {
  const times =
    booking.kind === "day_tour"
      ? `Day tours run ${stayTimes.dayTour}.`
      : `Check-in is from ${stayTimes.checkIn}. Check-out is by ${stayTimes.checkOut}.`;
  return (
    <Panel id="confirmed-title" title="You're booked!">
      <p className="flex items-center gap-2 font-bold text-success">
        <CheckIcon width={20} height={20} />
        Your booking is confirmed.
      </p>
      <p>{times}</p>
      <p>
        Balance due at check-in: <strong className="tabular-nums">{formatPeso(booking.balance)}</strong>
      </p>
      <div className="flex flex-col gap-2">
        <h3>What to bring</h3>
        <ul className="flex list-disc flex-col gap-1 pl-6">
          {whatToBring.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

function Expired({ booking }: StatusSectionProps) {
  return (
    <Panel id="expired-title" title="Your hold expired">
      <p>The time to pay ran out, so the slots were released. Nothing was charged.</p>
      <div className="flex flex-wrap gap-3">
        <Button href={bookAgainHref(booking)}>Book again</Button>
      </div>
    </Panel>
  );
}

function Rejected({ booking }: StatusSectionProps) {
  return (
    <Panel id="rejected-title" title="We could not confirm your payment">
      <p>{booking.reject_reason ?? "We could not verify your payment."}</p>
      <div>
        <MessengerButton label="Message us" />
      </div>
    </Panel>
  );
}

function PlainStatus({ booking }: StatusSectionProps) {
  return (
    <Panel id="status-title" title={statusLabel(booking.status)}>
      <p>This booking is {statusLabel(booking.status).toLowerCase()}.</p>
    </Panel>
  );
}

export async function StatusSection({ booking }: StatusSectionProps) {
  switch (booking.status) {
    case "awaiting_payment":
      return holdIsOpen(booking) ? <AwaitingPayment booking={booking} /> : <Expired booking={booking} />;
    case "payment_review":
      return <PaymentReview booking={booking} />;
    case "confirmed":
      return <Confirmed booking={booking} />;
    case "expired":
      return <Expired booking={booking} />;
    case "rejected":
      return <Rejected booking={booking} />;
    default:
      return <PlainStatus booking={booking} />;
  }
}
