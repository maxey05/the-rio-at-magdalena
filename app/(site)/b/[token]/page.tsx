import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { bookingSlotLabels, findByToken } from "@/lib/bookings";
import { holdIsOpen } from "@/lib/proofs";
import { addDays, formatPeso, type BookingStatus } from "@/lib/rules";
import { formatDayWithYear } from "@/lib/stay";
import type { Booking } from "@/lib/supabase";
import { PaymentStep } from "./payment-step";
import { ReviewStep } from "./review-step";
import { StatusSection } from "./status-sections";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type BookingPageProps = {
  params: Promise<{ token: string }>;
};

function shownStatus(booking: Booking): BookingStatus {
  return booking.status === "awaiting_payment" && !holdIsOpen(booking) ? "expired" : booking.status;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function stayText(booking: Booking): string {
  if (booking.kind === "day_tour") {
    return `Day tour on ${formatDayWithYear(booking.check_in)}`;
  }
  return `${formatDayWithYear(booking.check_in)} to ${formatDayWithYear(addDays(booking.check_in, booking.nights))}, ${plural(booking.nights, "night", "nights")}`;
}

function guestsText(booking: Booking): string {
  const parts = [
    booking.adults > 0 ? plural(booking.adults, "adult", "adults") : null,
    booking.seniors > 0 ? plural(booking.seniors, "senior", "seniors") : null,
    booking.kids > 0 ? `${plural(booking.kids, "child", "children")} (4 to 12)` : null,
    booking.infants > 0 ? `${plural(booking.infants, "child", "children")} (3 and below)` : null,
  ].filter((part): part is string => part !== null);
  return `${plural(booking.guests, "guest", "guests")}: ${parts.join(", ")}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium sm:text-right">{children}</dd>
    </div>
  );
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { token } = await params;
  const booking = await findByToken(token);
  if (!booking) {
    notFound();
  }
  const slotNames = await bookingSlotLabels(booking);

  if (booking.status === "awaiting_payment" && holdIsOpen(booking)) {
    return <PaymentStep booking={booking} slotNames={slotNames} />;
  }

  if (booking.status === "payment_review") {
    return <ReviewStep booking={booking} slotNames={slotNames} />;
  }

  return (
    <div className="mx-auto flex max-w-reading flex-col gap-8 px-4 py-12 md:py-16">
      <header className="flex flex-col items-start gap-3">
        <StatusBadge status={shownStatus(booking)} />
        <h1>Your booking</h1>
        <p className="text-h3 font-normal">
          Reference <span className="font-bold tabular-nums">{booking.ref}</span>
        </p>
      </header>

      <section aria-labelledby="stay-title" className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 md:p-6">
        <h2 id="stay-title" className="font-sans text-h3 font-bold">
          Your stay
        </h2>
        <dl className="divide-y divide-line">
          <Row label={booking.kind === "overnight" ? "Overnight stay" : "Day tour"}>{stayText(booking)}</Row>
          {slotNames.length > 0 ? <Row label="Slots">{slotNames.join(", ")}</Row> : null}
          <Row label="Guests">{guestsText(booking)}</Row>
          {booking.kind === "overnight" || booking.tents > 0 ? (
            <Row label="Tents">{booking.tents > 0 ? plural(booking.tents, "tent", "tents") : "None"}</Row>
          ) : null}
        </dl>
        <dl className="flex flex-col gap-1 border-t border-line pt-4">
          <div className="flex justify-between gap-4">
            <dt>Total</dt>
            <dd className="font-bold tabular-nums">{formatPeso(booking.total)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-h3 font-bold">
            <dt>Downpayment</dt>
            <dd className="tabular-nums">{formatPeso(booking.downpayment)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-ink-muted">
            <dt>Balance</dt>
            <dd className="font-bold tabular-nums">{formatPeso(booking.balance)}</dd>
          </div>
        </dl>
      </section>

      <StatusSection booking={booking} />
    </div>
  );
}
