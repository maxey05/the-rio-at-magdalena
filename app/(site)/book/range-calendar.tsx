"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { LABEL, ROUND_BUTTON } from "@/components/brand-styles";
import { Button } from "@/components/button";
import { addDays, stayNights, type StayKind } from "@/lib/rules";
import {
  formatDayLong,
  monthLabel,
  monthOf,
  monthWeeks,
  shiftMonth,
  type DateAvailability,
} from "@/lib/stay";

type RangeCalendarProps = {
  kind: StayKind;
  windowFirst: string;
  windowLast: string;
  dates: readonly DateAvailability[] | null;
  checkIn: string | null;
  nights: number;
  maxNights: number;
  onPick: (checkIn: string, nights: number) => void;
  onDone: () => void;
};

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function RangeCalendar({
  kind,
  windowFirst,
  windowLast,
  dates,
  checkIn,
  nights,
  maxNights,
  onPick,
  onDone,
}: RangeCalendarProps) {
  const [month, setMonth] = useState(monthOf(checkIn ?? windowFirst));
  const [picking, setPicking] = useState<"in" | "out">("in");
  const overnight = kind === "overnight";
  const byDate = new Map((dates ?? []).map((day) => [day.d, day]));
  const lastCheckOut = addDays(windowLast, 1);
  const checkOut = checkIn && overnight ? addDays(checkIn, nights) : null;

  function isOpen(date: string): boolean {
    const state = byDate.get(date)?.state;
    return date >= windowFirst && date <= windowLast && (state === "available" || state === "few");
  }

  function isValidCheckOut(date: string): boolean {
    if (!overnight || picking !== "out" || !checkIn || date <= checkIn || date > lastCheckOut) {
      return false;
    }
    const count = daysBetween(checkIn, date);
    return count <= maxNights && stayNights(checkIn, count).every(isOpen);
  }

  function pick(date: string) {
    if (isValidCheckOut(date) && checkIn) {
      onPick(checkIn, daysBetween(checkIn, date));
      setPicking("in");
      return;
    }
    onPick(date, 1);
    setPicking(overnight ? "out" : "in");
  }

  function describe(date: string, blocked: boolean, outside: boolean): string {
    const parts = [formatDayLong(date)];
    if (date === checkIn) {
      parts.push(overnight ? "check-in" : "visit date");
    } else if (date === checkOut) {
      parts.push("check-out");
    }
    if (blocked) {
      parts.push(byDate.get(date)?.state === "closed" ? "closed" : "fully booked");
    } else if (outside) {
      parts.push("not available");
    }
    return parts.join(", ");
  }

  function cellStyle(date: string, enabled: boolean, blocked: boolean): string {
    const base = "h-10 rounded-xs font-brand-body text-[1.0625rem] font-medium";
    const selected = date === checkIn || date === checkOut;
    if (selected) {
      return `${base} bg-olive-strong text-cream`;
    }
    if (checkIn && checkOut && date > checkIn && date < checkOut) {
      return `${base} bg-chartreuse text-earth`;
    }
    if (blocked) {
      return `${base} cursor-not-allowed border border-sienna bg-sienna-soft text-sienna-strong line-through`;
    }
    if (!enabled) {
      return `${base} cursor-not-allowed text-sand-muted`;
    }
    return `${base} text-earth hover:bg-chartreuse`;
  }

  const hint = !overnight ? "Pick your visit date" : picking === "out" ? "Now pick your check-out date" : "Pick your check-in date";
  const weeks = monthWeeks(month);
  const prevDisabled = month <= monthOf(windowFirst);
  const nextDisabled = month >= monthOf(lastCheckOut);

  return (
    <div
      role="dialog"
      aria-label="Choose your dates"
      className="absolute left-0 top-[calc(100%+0.5rem)] z-30 flex w-86 max-w-[calc(100vw-2rem)] flex-col gap-2.5 rounded-sm border border-oatmeal bg-cream-light p-4 shadow-float"
    >
      <p className={`${LABEL} text-sienna-strong`}>{hint}</p>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={prevDisabled}
          onClick={() => setMonth(shiftMonth(month, -1))}
          className={ROUND_BUTTON}
        >
          <ChevronLeftIcon width={16} height={16} />
        </button>
        <span className="font-brand-body text-xl font-medium">{monthLabel(month)}</span>
        <button
          type="button"
          aria-label="Next month"
          disabled={nextDisabled}
          onClick={() => setMonth(shiftMonth(month, 1))}
          className={ROUND_BUTTON}
        >
          <ChevronRightIcon width={16} height={16} />
        </button>
      </div>
      <div aria-hidden="true" className={`grid grid-cols-7 gap-0.5 text-center text-earth-muted ${LABEL}`}>
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      {dates === null ? <p role="status" className="text-earth-muted">Loading availability...</p> : null}
      <div className="grid grid-cols-7 gap-0.5">
        {weeks.flat().map((date, index) => {
          if (date === null) {
            return <span key={`blank-${index}`} className="h-10" />;
          }
          const state = byDate.get(date)?.state;
          const enabled = dates !== null && (isOpen(date) || isValidCheckOut(date));
          const blocked =
            !enabled && date >= windowFirst && date <= windowLast && (state === "full" || state === "closed");
          const outside = date < windowFirst || date > lastCheckOut;
          return (
            <button
              key={date}
              type="button"
              aria-label={describe(date, blocked, outside)}
              aria-pressed={date === checkIn || date === checkOut}
              disabled={!enabled}
              onClick={() => pick(date)}
              className={cellStyle(date, enabled, blocked)}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-[0.9375rem] text-earth-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3.5 rounded-xs border border-sienna bg-sienna-soft" />
          Fully booked
        </span>
        <Button type="button" variant="olive" size="small" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
