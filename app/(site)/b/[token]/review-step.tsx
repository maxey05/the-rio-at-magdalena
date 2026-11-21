import type { ReactNode } from "react";
import { CARD, LABEL, PAGE_TITLE, SECTION_TITLE } from "@/components/brand-styles";
import { Button } from "@/components/button";
import { CheckIcon, ClockIcon } from "@/components/icons";
import { MessengerButton } from "@/components/messenger-button";
import { addDays, formatPeso, isGuestCancellable, manilaToday, type GuestCounts } from "@/lib/rules";
import { formatDay } from "@/lib/stay";
import type { Booking } from "@/lib/supabase";
import { CancelForm } from "./cancel-form";

type ReviewStepProps = {
  booking: Booking;
  slotNames: string[];
};

const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function short(date: string): string {
  return shortDay.format(new Date(`${date}T00:00:00Z`));
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function campersText(guests: Pick<GuestCounts, "adults" | "seniors" | "kids">): string {
  const parts = [
    guests.adults > 0 ? plural(guests.adults, "adult", "adults") : null,
    guests.seniors > 0 ? plural(guests.seniors, "senior", "seniors") : null,
    guests.kids > 0 ? plural(guests.kids, "child", "children") : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(", ") : "None";
}

export function datesText(booking: Booking): string {
  if (booking.kind === "day_tour") {
    return formatDay(booking.check_in);
  }
  return `${short(booking.check_in)} – ${short(addDays(booking.check_in, booking.nights))}`;
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-earth-muted">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

function PulseDots() {
  return (
    <span aria-hidden="true" className="ml-1.5 inline-flex items-center gap-1 align-middle">
      <span className="dot-pulse size-1.5 rounded-full bg-olive-strong" />
      <span className="dot-pulse size-1.5 rounded-full bg-olive-strong" />
      <span className="dot-pulse size-1.5 rounded-full bg-olive-strong" />
    </span>
  );
}

function CancelCard({ booking }: { booking: Booking }) {
  const cancellable = isGuestCancellable({ status: booking.status, checkIn: booking.check_in }, manilaToday());
  return (
    <section
      aria-labelledby="cancel-title"
      className={`${CARD} flex flex-col gap-3 px-6 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between`}
    >
      <div className="flex min-w-0 flex-col gap-1 sm:flex-[1_1_16rem]">
        <h2 id="cancel-title" className="font-brand-display text-[1.5rem] leading-[1.15] font-normal text-earth">
          Need to cancel?
        </h2>
        <p className="text-earth-muted">
          {cancellable
            ? "Valid up to 7 days, we'll refund your downpayment in full."
            : "Online cancellation has closed. Message us and we will help."}
        </p>
      </div>
      {cancellable ? (
        <CancelForm token={booking.access_token} />
      ) : (
        <div>
          <MessengerButton variant="secondary" label="Message us to cancel" />
        </div>
      )}
    </section>
  );
}

export function ReviewStep({ booking, slotNames }: ReviewStepProps) {
  const slotCodes = slotNames.map((name) => name.replace(/^.* Slot /, ""));

  return (
    <div className="bg-cream font-brand-body text-[1.125rem] text-earth">
      <div className="screen-forward mx-auto flex max-w-page flex-col gap-5 px-4 pb-12 pt-8 md:px-8 md:pt-10">
        <div className="flex flex-col gap-3">
          <h1 className={PAGE_TITLE}>Your booking</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className={`inline-flex items-center gap-2 rounded-xs bg-river-mist px-3 py-1.5 text-earth ${LABEL}`}>
              <ClockIcon width={16} height={16} />
              Checking payment
            </span>
            <p className="text-earth-muted">
              Reference <strong className="font-semibold tabular-nums text-earth">{booking.ref}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-5">
          <div className="flex min-w-0 flex-[999_1_37.5rem] flex-col gap-5">
            <section aria-labelledby="review-title" className={`${CARD} flex flex-col gap-4 px-6 py-5.5`}>
              <h2 id="review-title" className={SECTION_TITLE}>
                {"We're checking your payment"}
                <PulseDots />
              </h2>
              <div className="flex items-center gap-3 rounded-xs bg-chartreuse px-4 py-3">
                <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-success text-cream">
                  <CheckIcon width={16} height={16} strokeWidth={2.6} />
                </span>
                <p className="font-semibold">Payment received</p>
              </div>
              <p>{"An admin is checking your payment now. Once it's confirmed, we'll send a confirmation email for your booking."}</p>
            </section>

            <CancelCard booking={booking} />
          </div>

          <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-4">
            <aside aria-labelledby="stay-title" className={`${CARD} flex flex-col gap-3 px-5 py-4.5`}>
              <h2 id="stay-title" className={SECTION_TITLE}>
                Your stay
              </h2>
              <dl className="flex flex-col gap-1.5 text-[1.0625rem]">
                <Row label="Visit">{booking.kind === "overnight" ? "Overnight" : "Day tour"}</Row>
                <Row label="Dates">{datesText(booking)}</Row>
                <Row label="Campers">{campersText(booking)}</Row>
                {slotCodes.length > 0 ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-earth-muted">Slots</dt>
                    <dd className="flex flex-wrap justify-end gap-1.5">
                      {slotCodes.map((code) => (
                        <span key={code} className={`inline-flex items-center rounded-xs bg-oatmeal px-2.5 py-1 text-earth ${LABEL}`}>
                          {code}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <dl className="flex flex-col gap-0.5 border-t border-oatmeal pt-2.5">
                <div className="flex justify-between gap-3 text-[1.0625rem]">
                  <dt>Total</dt>
                  <dd className="font-semibold tabular-nums">{formatPeso(booking.total)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 text-[1.375rem] font-semibold">
                  <dt>Downpayment paid</dt>
                  <dd className="tabular-nums">{formatPeso(booking.downpayment)}</dd>
                </div>
                <div className="flex justify-between gap-3 text-[1.0625rem] text-earth-muted">
                  <dt>Balance</dt>
                  <dd className="font-semibold tabular-nums">{formatPeso(booking.balance)}</dd>
                </div>
              </dl>
            </aside>
            <Button href="/" variant="ghost-earth" className="w-full">
              Return to homepage
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
