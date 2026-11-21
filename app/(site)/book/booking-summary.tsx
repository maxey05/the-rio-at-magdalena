"use client";

import { useState, type ReactNode } from "react";
import { LABEL, SECTION_TITLE } from "@/components/brand-styles";
import { CloseIcon } from "@/components/icons";
import { addDays, formatPeso, type GuestCounts, type PriceQuote, type StayKind } from "@/lib/rules";
import { formatDay } from "@/lib/stay";

export type SummaryChip = {
  id: number;
  label: string;
};

type BookingSummaryProps = {
  kind: StayKind;
  checkIn: string | null;
  nights: number;
  guests: GuestCounts;
  slotChips: readonly SummaryChip[];
  onRemoveSlot?: (id: number) => void;
  quote: PriceQuote | null;
  downpaymentPct: number;
  warning: string | null;
  headerAction?: ReactNode;
  children?: ReactNode;
};

const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function short(date: string): string {
  return shortDay.format(new Date(`${date}T00:00:00Z`));
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function guestsText(guests: GuestCounts): string {
  const parts = [
    guests.adults > 0 ? plural(guests.adults, "adult", "adults") : null,
    guests.seniors > 0 ? plural(guests.seniors, "senior", "seniors") : null,
    guests.kids > 0 ? plural(guests.kids, "child", "children") : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(", ") : "None yet";
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-earth-muted">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

function FadeText({ text }: { text: string }) {
  return (
    <span key={text} className="fade-up inline-block">
      {text}
    </span>
  );
}

function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="fold-box" data-open={open} aria-hidden={!open} inert={!open}>
      <div>{children}</div>
    </div>
  );
}

export function BookingSummary({
  kind,
  checkIn,
  nights,
  guests,
  slotChips,
  onRemoveSlot,
  quote,
  downpaymentPct,
  warning,
  headerAction,
  children,
}: BookingSummaryProps) {
  const overnight = kind === "overnight";
  const datesText = checkIn ? (overnight ? `${short(checkIn)} – ${short(addDays(checkIn, nights))}` : formatDay(checkIn)) : "Not chosen";
  const priced = quote !== null && quote.total > 0;
  const [shownQuote, setShownQuote] = useState(quote);
  const [shownWarning, setShownWarning] = useState(warning);
  if (priced && quote !== shownQuote) {
    setShownQuote(quote);
  }
  if (warning !== null && warning !== shownWarning) {
    setShownWarning(warning);
  }

  return (
    <aside
      aria-label="Booking summary"
      className="flex min-w-0 flex-[1_1_20rem] flex-col gap-3 rounded-sm border border-oatmeal bg-cream-light px-5 py-4.5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={SECTION_TITLE}>Your booking</h2>
        {headerAction}
      </div>

      <dl className="flex flex-col gap-1.5 text-[1.0625rem]">
        <Row label="Visit">
          <FadeText text={overnight ? "Overnight" : "Day tour"} />
        </Row>
        <Row label="Dates">
          <FadeText text={datesText} />
        </Row>
        <Row label="Campers">{guestsText(guests)}</Row>
        <div className="flex flex-col gap-1.5">
          <dt className="text-earth-muted">Slots</dt>
          <dd className="flex flex-wrap gap-1.5">
            {slotChips.map((chip) => (
              <span
                key={chip.id}
                className={`fade-up inline-flex items-center gap-0.5 rounded-xs bg-oatmeal pl-2.5 text-earth ${LABEL} ${onRemoveSlot ? "" : "pr-2.5"}`}
              >
                {chip.label}
                {onRemoveSlot ? (
                  <button
                    type="button"
                    aria-label={`Remove ${chip.label}`}
                    onClick={() => onRemoveSlot(chip.id)}
                    className="grid size-8 place-items-center"
                  >
                    <CloseIcon width={11} height={11} strokeWidth={2.5} />
                  </button>
                ) : null}
              </span>
            ))}
            {slotChips.length === 0 ? <span className="text-earth-muted">None yet. Pick on the map.</span> : null}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col">
        <Collapse open={warning !== null}>
          <p role="status" className="mb-3 rounded-xs bg-warning-soft px-3 py-2 text-base font-semibold text-warning-strong">
            {shownWarning}
          </p>
        </Collapse>

        <Collapse open={priced}>
          {shownQuote ? (
            <div className="flex flex-col gap-3">
              <ul className="flex flex-col gap-0.5 border-t border-oatmeal pt-2.5 text-base">
                {shownQuote.lines.map((line) => (
                  <li key={line.label} className="flex justify-between gap-3">
                    <span>
                      {line.label} × {line.quantity}
                    </span>
                    <span className="font-semibold tabular-nums">{formatPeso(line.amount)}</span>
                  </li>
                ))}
              </ul>
              <dl className="flex flex-col gap-0.5 border-t border-oatmeal pt-2.5">
                <div className="flex justify-between gap-3 text-[1.0625rem]">
                  <dt>Total</dt>
                  <dd className="font-semibold tabular-nums">{formatPeso(shownQuote.total)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 text-[1.375rem] font-semibold">
                  <dt>Downpayment ({downpaymentPct}%)</dt>
                  <dd className="tabular-nums">{formatPeso(shownQuote.downpayment)}</dd>
                </div>
                <div className="flex justify-between gap-3 text-[1.0625rem] text-earth-muted">
                  <dt>Balance</dt>
                  <dd className="font-semibold tabular-nums">{formatPeso(shownQuote.balance)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </Collapse>

        <Collapse open={!priced}>
          <p className="border-t border-oatmeal pt-2.5 text-base text-earth-muted">Choose your dates and campers to see the price.</p>
        </Collapse>
      </div>
      {children}
    </aside>
  );
}
