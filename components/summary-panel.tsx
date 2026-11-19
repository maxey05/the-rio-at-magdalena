"use client";

import { useRef, type ReactNode } from "react";
import { Button } from "@/components/button";
import { CloseIcon } from "@/components/icons";
import { addDays, formatPeso, type GuestCounts, type PriceQuote, type StayKind } from "@/lib/rules";
import { formatDay } from "@/lib/stay";

export type SummaryData = {
  kind: StayKind | null;
  checkIn: string | null;
  nights: number;
  slotLabels: readonly string[];
  guests: GuestCounts;
  tents: number;
  quote: PriceQuote | null;
};

type RowProps = {
  label: string;
  children: ReactNode;
};

function Row({ label, children }: RowProps) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function datesText(data: SummaryData): string | null {
  if (!data.checkIn) {
    return null;
  }
  if (data.kind === "day_tour") {
    return formatDay(data.checkIn);
  }
  const nightsText = `${data.nights} ${data.nights === 1 ? "night" : "nights"}`;
  return `${formatDay(data.checkIn)} to ${formatDay(addDays(data.checkIn, data.nights))}, ${nightsText}`;
}

function guestsText(guests: GuestCounts): string {
  const parts = [
    guests.adults > 0 ? `${guests.adults} ${guests.adults === 1 ? "adult" : "adults"}` : null,
    guests.seniors > 0 ? `${guests.seniors} ${guests.seniors === 1 ? "senior" : "seniors"}` : null,
    guests.kids > 0 ? `${guests.kids} ${guests.kids === 1 ? "child" : "children"} (4 to 12)` : null,
    guests.infants > 0 ? `${guests.infants} ${guests.infants === 1 ? "child" : "children"} (3 and below)` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(", ") : "None yet";
}

export function SummaryPanel({ data }: { data: SummaryData }) {
  const dates = datesText(data);
  const { quote } = data;
  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 md:p-6">
      <h2 className="text-h3 font-sans font-bold md:text-h3">Your booking</h2>
      <dl>
        <Row label="Type">{data.kind === null ? "Not chosen" : data.kind === "overnight" ? "Overnight" : "Day tour"}</Row>
        <Row label="Dates">{dates ?? "Not chosen"}</Row>
        {data.kind === "overnight" ? (
          <Row label="Slots">
            {data.slotLabels.length > 0 ? (
              <ul>
                {data.slotLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            ) : (
              "Not chosen"
            )}
          </Row>
        ) : null}
        <Row label="Guests">{guestsText(data.guests)}</Row>
        {data.kind === "overnight" ? (
          <Row label="Tents">{data.tents > 0 ? data.tents : "None"}</Row>
        ) : null}
      </dl>
      {quote && quote.total > 0 ? (
        <>
          <ul className="flex flex-col gap-1 border-t border-line pt-4">
            {quote.lines.map((line) => (
              <li key={line.label} className="flex justify-between gap-4 text-small">
                <span>
                  {line.label} × {line.quantity}
                </span>
                <span className="font-bold tabular-nums">{formatPeso(line.amount)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 border-t border-line pt-4">
            <div className="flex justify-between gap-4">
              <dt>Total</dt>
              <dd className="font-bold tabular-nums">{formatPeso(quote.total)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-h3 font-bold">
              <dt>Downpayment now</dt>
              <dd className="tabular-nums">{formatPeso(quote.downpayment)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-ink-muted">
              <dt>Balance at check-in</dt>
              <dd className="font-bold tabular-nums">{formatPeso(quote.balance)}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="border-t border-line pt-4 text-small text-ink-muted">
          Choose your dates and guests to see the price.
        </p>
      )}
    </div>
  );
}

type SummarySheetProps = {
  data: SummaryData;
  onReview: () => void;
};

export function SummarySheet({ data, onReview }: SummarySheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const total = data.quote && data.quote.total > 0 ? formatPeso(data.quote.total) : null;

  function closeSheet() {
    dialogRef.current?.close();
  }

  function goToReview() {
    closeSheet();
    onReview();
  }

  return (
    <div className="lg:hidden">
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-line bg-surface px-4 py-3 shadow-float">
        <div className="flex flex-col">
          <span className="text-small text-ink-muted">{total ? "Total" : "Your booking"}</span>
          <span className="text-h3 font-bold tabular-nums">{total ?? "Price pending"}</span>
        </div>
        <Button size="small" variant="secondary" aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>
          Review
        </Button>
      </div>
      <dialog
        ref={dialogRef}
        aria-label="Booking summary"
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            closeSheet();
          }
        }}
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-card bg-bg p-0 text-ink backdrop:bg-forest/60"
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <p className="text-h3 font-bold">Summary</p>
            <button
              type="button"
              onClick={closeSheet}
              aria-label="Close summary"
              className="inline-flex size-11 items-center justify-center rounded-full"
            >
              <CloseIcon />
            </button>
          </div>
          <SummaryPanel data={data} />
          <Button onClick={goToReview} className="w-full">
            Go to review
          </Button>
        </div>
      </dialog>
    </div>
  );
}
