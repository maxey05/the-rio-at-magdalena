"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon, LockIcon } from "@/components/icons";
import { addDays, stayNights, type StayKind } from "@/lib/rules";
import {
  formatDayLong,
  monthLabel,
  monthOf,
  monthWeeks,
  shiftMonth,
  type DateAvailability,
  type DateState,
} from "@/lib/stay";

type DateCalendarProps = {
  windowFirst: string;
  windowLast: string;
  dates: readonly DateAvailability[] | null;
  kind: StayKind;
  checkIn: string | null;
  nights: number;
  onSelect: (date: string) => void;
};

type CellKind = DateState | "outside" | "loading";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CELL_SPEECH: Record<CellKind, string> = {
  available: "available",
  few: "few spots left",
  full: "full, cannot be selected",
  closed: "closed, cannot be selected",
  outside: "not bookable, outside the booking window",
  loading: "availability still loading, cannot be selected",
};

function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function cellId(date: string): string {
  return `calendar-${date}`;
}

function isSelectable(kind: CellKind): boolean {
  return kind === "available" || kind === "few";
}

export function DateCalendar({ windowFirst, windowLast, dates, kind, checkIn, nights, onSelect }: DateCalendarProps) {
  const [focusDate, setFocusDate] = useState(checkIn ?? windowFirst);
  const [month, setMonth] = useState(monthOf(checkIn ?? windowFirst));
  const moveFocus = useRef(false);

  useEffect(() => {
    if (moveFocus.current) {
      moveFocus.current = false;
      document.getElementById(cellId(focusDate))?.focus();
    }
  }, [focusDate, month]);

  const byDate = new Map((dates ?? []).map((day) => [day.d, day]));
  const staying = new Set(checkIn ? (kind === "overnight" ? stayNights(checkIn, nights) : [checkIn]) : []);
  const lastNight = checkIn && kind === "overnight" ? addDays(checkIn, nights - 1) : checkIn;
  const tabbable = monthOf(focusDate) === month ? focusDate : month === monthOf(windowFirst) ? windowFirst : `${month}-01`;

  function cellKind(date: string): CellKind {
    if (date < windowFirst || date > windowLast) {
      return "outside";
    }
    return byDate.get(date)?.state ?? "loading";
  }

  function clampToWindow(date: string): string {
    return date < windowFirst ? windowFirst : date > windowLast ? windowLast : date;
  }

  function moveTo(date: string) {
    const target = clampToWindow(date);
    moveFocus.current = true;
    setFocusDate(target);
    setMonth(monthOf(target));
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const steps: Record<string, string> = {
      ArrowLeft: addDays(date, -1),
      ArrowRight: addDays(date, 1),
      ArrowUp: addDays(date, -7),
      ArrowDown: addDays(date, 7),
      Home: addDays(date, -weekday(date)),
      End: addDays(date, 6 - weekday(date)),
    };
    const target = steps[event.key];
    if (target) {
      event.preventDefault();
      moveTo(target);
    }
  }

  function chooseDate(date: string) {
    setFocusDate(date);
    if (isSelectable(cellKind(date))) {
      onSelect(date);
    }
  }

  function cellStyle(date: string, kindOfCell: CellKind): string {
    const isEnd = date === checkIn || date === lastNight;
    if (staying.has(date)) {
      return isEnd ? "bg-moss-strong font-bold text-surface" : "bg-moss-tint font-bold text-ink";
    }
    if (kindOfCell === "outside" || kindOfCell === "loading") {
      return "text-ink-muted/60";
    }
    if (kindOfCell === "full" || kindOfCell === "closed") {
      return "text-ink-muted line-through";
    }
    return "text-ink hover:bg-moss-soft";
  }

  const weeks = monthWeeks(month);
  const headingId = "calendar-month";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={month <= monthOf(windowFirst)}
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-moss-strong hover:bg-moss-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeftIcon />
        </button>
        <h3 id={headingId} aria-live="polite">
          {monthLabel(month)}
        </h3>
        <button
          type="button"
          aria-label="Next month"
          disabled={month >= monthOf(windowLast)}
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-moss-strong hover:bg-moss-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRightIcon />
        </button>
      </div>
      <div role="grid" aria-labelledby={headingId} className="flex flex-col gap-1">
        <div role="row" className="grid grid-cols-7">
          {WEEKDAYS.map((name) => (
            <div key={name} role="columnheader" className="py-1 text-center text-small font-medium text-ink-muted">
              {name}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week.find(Boolean)} role="row" className="grid grid-cols-7 gap-y-1">
            {week.map((date, index) =>
              date === null ? (
                <div key={`blank-${index}`} role="gridcell" />
              ) : (
                <div key={date} role="gridcell" aria-selected={staying.has(date)}>
                  <CalendarCell
                    date={date}
                    cell={cellKind(date)}
                    style={cellStyle(date, cellKind(date))}
                    tabbable={date === tabbable}
                    isStart={date === checkIn}
                    isStay={staying.has(date)}
                    onChoose={chooseDate}
                    onKeyDown={onKeyDown}
                  />
                </div>
              ),
            )}
          </div>
        ))}
      </div>
      <ul aria-label="Calendar key" className="flex flex-wrap gap-x-5 gap-y-1 text-small text-ink-muted">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-ember-strong" />
          Few left
        </li>
        <li className="line-through">Full</li>
        <li className="flex items-center gap-1">
          <LockIcon width={14} height={14} />
          <span className="line-through">Closed</span>
        </li>
      </ul>
    </div>
  );
}

type CalendarCellProps = {
  date: string;
  cell: CellKind;
  style: string;
  tabbable: boolean;
  isStart: boolean;
  isStay: boolean;
  onChoose: (date: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, date: string) => void;
};

function CalendarCell({ date, cell, style, tabbable, isStart, isStay, onChoose, onKeyDown }: CalendarCellProps) {
  const outside = cell === "outside";
  const speech = isStart ? "selected, check-in" : isStay ? "selected, included night" : CELL_SPEECH[cell];
  return (
    <button
      type="button"
      id={cellId(date)}
      disabled={outside}
      aria-disabled={!isSelectable(cell) || undefined}
      aria-label={`${formatDayLong(date)}, ${speech}`}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => onChoose(date)}
      onKeyDown={(event) => onKeyDown(event, date)}
      className={`relative flex h-11 w-full items-center justify-center rounded-input text-body tabular-nums transition-colors duration-150 ease-out ${style} ${isSelectable(cell) || isStay ? "cursor-pointer" : "cursor-not-allowed"}`}
    >
      {Number(date.slice(8))}
      {cell === "few" ? (
        <span aria-hidden="true" className="absolute bottom-1 size-1.5 rounded-full bg-ember-strong" />
      ) : null}
      {cell === "closed" ? <LockIcon width={10} height={10} className="absolute right-1 top-1" /> : null}
    </button>
  );
}
