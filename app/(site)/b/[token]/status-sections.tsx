import type { ReactNode } from "react";
import { Button } from "@/components/button";
import { CheckIcon } from "@/components/icons";
import { MessengerButton } from "@/components/messenger-button";
import { stayTimes, whatToBring } from "@/lib/content";
import { formatPeso, isGuestCancellable, manilaNow, manilaToday, statusLabel } from "@/lib/rules";
import type { Booking } from "@/lib/supabase";
import { CancelForm } from "./cancel-form";

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
        Balance due a day before arrival: <strong className="tabular-nums">{formatPeso(booking.balance)}</strong>
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

export function CancelSection({ booking }: StatusSectionProps) {
  if (!isGuestCancellable({ status: booking.status, checkIn: booking.check_in }, manilaToday())) {
    return (
      <Panel id="cancel-title" title="Need to cancel?">
        <p>Online cancellation closes the day before check-in. Please message us and we will help.</p>
        <div>
          <MessengerButton variant="secondary" label="Message us to cancel" />
        </div>
      </Panel>
    );
  }
  const paid = booking.status !== "awaiting_payment";
  return (
    <Panel id="cancel-title" title="Need to cancel?">
      <p>
        {paid
          ? `You can cancel until 11:59 PM the day before check-in. We will refund your downpayment of ${formatPeso(booking.downpayment)} by GCash.`
          : "You can cancel until 11:59 PM the day before check-in. We have not received a payment proof, so there is nothing to refund. If you already sent GCash, message us before you cancel."}
      </p>
      <CancelForm token={booking.access_token} />
    </Panel>
  );
}

function RefundNote({ booking }: StatusSectionProps) {
  if (booking.refund_status === "due") {
    return (
      <p>
        A full refund of <strong className="tabular-nums">{formatPeso(booking.downpayment)}</strong> is due to you. We will
        send it by GCash to {booking.mobile} and email you when it is sent. If that is not your GCash number, please
        message us.
      </p>
    );
  }
  if (booking.refund_status === "sent") {
    const reference = booking.refund_ref ? `, reference ${booking.refund_ref}` : "";
    const sentAt = booking.refunded_at ? ` on ${formatManilaTime(booking.refunded_at)} (Manila time)` : "";
    return <p>{`Refund of ${formatPeso(booking.downpayment)} sent by GCash${reference}${sentAt}.`}</p>;
  }
  return null;
}

function Cancelled({ booking }: StatusSectionProps) {
  return (
    <Panel id="cancelled-title" title="This booking was cancelled">
      <p>{booking.cancelled_by === "guest" ? "You cancelled this booking." : "We cancelled this booking."}</p>
      {booking.cancelled_by === "admin" && booking.cancel_reason ? <p>Reason: {booking.cancel_reason}</p> : null}
      {booking.cancelled_at ? (
        <p className="text-ink-muted">Cancelled {formatManilaTime(booking.cancelled_at)} (Manila time).</p>
      ) : null}
      {booking.refund_status === "none" ? <p>No payment was received, so there is nothing to refund. If you did send GCash, message us and we will refund it.</p> : null}
      <RefundNote booking={booking} />
    </Panel>
  );
}

function WithCancel({ booking, children }: StatusSectionProps & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-8">
      {children}
      <CancelSection booking={booking} />
    </div>
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
      <RefundNote booking={booking} />
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
      return <Expired booking={booking} />;
    case "confirmed":
      return (
        <WithCancel booking={booking}>
          <Confirmed booking={booking} />
        </WithCancel>
      );
    case "cancelled":
      return <Cancelled booking={booking} />;
    case "expired":
      return <Expired booking={booking} />;
    case "rejected":
      return <Rejected booking={booking} />;
    default:
      return <PlainStatus booking={booking} />;
  }
}
