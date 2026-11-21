import { CARD, LABEL, PAGE_TITLE, SECTION_TITLE } from "@/components/brand-styles";
import { Button } from "@/components/button";
import { CloseIcon } from "@/components/icons";
import { site } from "@/lib/content";
import { formatPeso } from "@/lib/rules";
import type { Booking } from "@/lib/supabase";
import { campersText, datesText, Row } from "./review-step";
import { RefundNote } from "./status-sections";

type CancelledStepProps = {
  booking: Booking;
  slotNames: string[];
};

function tentsText(count: number): string {
  return count > 0 ? `${count} ${count === 1 ? "tent" : "tents"}` : "None";
}

function RefundBlock({ booking }: { booking: Booking }) {
  if (booking.refund_status === "none") {
    return <p>No payment was received, so there is nothing to refund. If you did send GCash, message us and we will refund it.</p>;
  }
  return (
    <div className="flex flex-col gap-1 rounded-xs bg-chartreuse px-4 py-3">
      <p className={LABEL}>{booking.refund_status === "due" ? "Refund on the way" : "Refund sent"}</p>
      <RefundNote booking={booking} />
    </div>
  );
}

export function CancelledStep({ booking, slotNames }: CancelledStepProps) {
  const slotCodes = slotNames.map((name) => name.replace(/^.* Slot /, ""));
  const refunded = booking.refund_status !== "none";

  return (
    <div className="bg-cream font-brand-body text-[1.125rem] text-earth">
      <div className="screen-forward mx-auto flex max-w-page flex-col gap-5 px-4 pb-12 pt-8 md:px-8 md:pt-10">
        <div className="flex flex-col gap-3">
          <h1 className={PAGE_TITLE}>Your booking</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className={`inline-flex items-center gap-2 rounded-xs bg-sienna-soft px-3 py-1.5 text-sienna-strong ${LABEL}`}>
              <CloseIcon width={14} height={14} strokeWidth={2.4} />
              Cancelled
            </span>
            <p className="text-earth-muted">
              Reference <strong className="font-semibold tabular-nums text-earth">{booking.ref}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-5">
          <section aria-labelledby="cancelled-title" className={`${CARD} flex min-w-0 flex-[999_1_37.5rem] flex-col gap-4 px-6 py-5.5`}>
            <h2 id="cancelled-title" className={SECTION_TITLE}>
              This booking was cancelled
            </h2>
            {booking.cancelled_by === "admin" && booking.cancel_reason ? <p>Reason: {booking.cancel_reason}</p> : null}
            <RefundBlock booking={booking} />
            <p className="text-earth-muted">
              Have any questions?{" "}
              <a
                href={site.messengerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-olive-strong underline underline-offset-3 hover:text-olive-deep"
              >
                Message us on Messenger
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          </section>

          <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-4">
            <aside aria-labelledby="stay-title" className={`${CARD} flex flex-col gap-3 px-5 py-4.5`}>
              <h2 id="stay-title" className={SECTION_TITLE}>
                Your stay
              </h2>
              <dl className="flex flex-col gap-1.5 text-[1.0625rem]">
                <Row label="Visit">{booking.kind === "overnight" ? "Overnight" : "Day tour"}</Row>
                <Row label="Dates">{datesText(booking)}</Row>
                <Row label="Campers">{campersText(booking)}</Row>
                {booking.kind === "overnight" || booking.tents > 0 ? <Row label="Tents">{tentsText(booking.tents)}</Row> : null}
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
                <div className="flex justify-between gap-3 text-[1.0625rem] text-earth-muted">
                  <dt>Total</dt>
                  <dd className="font-semibold tabular-nums line-through">{formatPeso(booking.total)}</dd>
                </div>
                {refunded ? (
                  <div className="flex items-baseline justify-between gap-3 text-[1.375rem] font-semibold">
                    <dt>Refund</dt>
                    <dd className="tabular-nums">{formatPeso(booking.downpayment)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3 text-[1.0625rem] text-earth-muted">
                  <dt>Balance</dt>
                  <dd className="font-semibold">None due</dd>
                </div>
              </dl>
            </aside>
            <Button href="/" variant="olive" arrow className="w-full">
              Return to homepage
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
