"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LABEL, ROUND_BUTTON } from "@/components/brand-styles";
import { Button } from "@/components/button";
import { CalendarIcon, ChevronDownIcon } from "@/components/icons";
import { addDays, guestCount, type GuestCounts, type StayKind } from "@/lib/rules";
import { formatDay, type DateAvailability } from "@/lib/stay";
import { RangeCalendar } from "./range-calendar";

type GuestKey = keyof GuestCounts;

type BookingBarProps = {
  kind: StayKind;
  onKind: (kind: StayKind) => void;
  checkIn: string | null;
  nights: number;
  dates: readonly DateAvailability[] | null;
  windowFirst: string;
  windowLast: string;
  maxNights: number;
  onDates: (checkIn: string, nights: number) => void;
  guests: GuestCounts;
  guestMax: (key: GuestKey) => number;
  onGuest: (key: GuestKey, value: number) => void;
  tents: number;
  tentMax: number;
  onTents: (value: number) => void;
};

type OpenField = "dates" | "campers" | null;

const KIND_OPTIONS = [
  { value: "overnight", title: "Overnight", times: "2 PM to 11 AM" },
  { value: "day_tour", title: "Day tour", times: "8 AM to 6 PM" },
] as const;

const GUEST_ROWS: readonly { key: GuestKey; label: string; hint: string }[] = [
  { key: "adults", label: "Adults", hint: "Ages 13 to 59" },
  { key: "seniors", label: "Seniors", hint: "60 and above" },
  { key: "kids", label: "Children", hint: "Ages 4 to 12" },
];

const FIELD_BUTTON =
  "flex min-h-14 flex-1 items-center justify-between gap-2 rounded-xs border border-oatmeal bg-cream-light px-3.5 py-1.5 text-left text-earth transition-colors duration-150 ease-out hover:border-olive-strong";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function guestSummary(guests: GuestCounts): string {
  const total = guestCount(guests);
  if (total === 0) {
    return "Add campers";
  }
  const parts = [
    guests.adults > 0 ? plural(guests.adults, "adult", "adults") : null,
    guests.seniors > 0 ? plural(guests.seniors, "senior", "seniors") : null,
    guests.kids > 0 ? plural(guests.kids, "child", "children") : null,
  ].filter((part): part is string => part !== null);
  return `${plural(total, "camper", "campers")} · ${parts.join(", ")}`;
}

type FieldPopoverProps = {
  label: string;
  value: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  className: string;
  children: ReactNode;
};

function FieldPopover({ label, value, icon, open, onToggle, onClose, className, children }: FieldPopoverProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (wrapperRef.current && event.target instanceof Node && !wrapperRef.current.contains(event.target)) {
        onClose();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={wrapperRef} className={`relative flex ${className}`}>
      <button ref={buttonRef} type="button" aria-expanded={open} aria-haspopup="dialog" onClick={onToggle} className={FIELD_BUTTON}>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className={`${LABEL} text-earth-muted`}>{label}</span>
          <span className="truncate font-brand-body text-xl font-medium">{value}</span>
        </span>
        <span className="shrink-0 text-olive-strong">{icon}</span>
      </button>
      {open ? children : null}
    </div>
  );
}

type CounterProps = {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
};

function Counter({ label, hint, value, min, max, onChange, className = "" }: CounterProps) {
  return (
    <div role="group" aria-label={label} className={`flex items-center justify-between gap-3 ${className}`}>
      <span className="flex flex-col leading-tight">
        <span className="font-brand-body text-lg font-semibold">{label}</span>
        {hint ? <span className="text-base text-earth-muted">{hint}</span> : null}
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className={ROUND_BUTTON}
        >
          −
        </button>
        <span aria-live="polite" className="min-w-7 text-center font-brand-body text-[1.1875rem] font-semibold tabular-nums">
          {value}
        </span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className={ROUND_BUTTON}
        >
          +
        </button>
      </span>
    </div>
  );
}

export function BookingBar(props: BookingBarProps) {
  const { kind, checkIn, nights, guests, tents, tentMax } = props;
  const [open, setOpen] = useState<OpenField>(null);
  const close = useCallback(() => setOpen(null), []);
  const overnight = kind === "overnight";
  const dateValue = checkIn
    ? overnight
      ? `${formatDay(checkIn)}  →  ${formatDay(addDays(checkIn, nights))}`
      : formatDay(checkIn)
    : "Choose dates";

  return (
    <div className="flex flex-wrap items-stretch gap-2 rounded-sm border border-oatmeal bg-cream-light p-2">
      <div role="group" aria-label="Type of visit" className="relative grid grid-cols-2 rounded-xs bg-cream p-1">
        <span
          aria-hidden="true"
          data-kind={kind}
          className="kind-pill pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xs bg-olive-strong"
        />
        {KIND_OPTIONS.map((option) => {
          const active = kind === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => props.onKind(option.value)}
              className={`relative z-10 flex min-h-12 flex-col items-start justify-center gap-0.5 rounded-xs px-4 py-1 transition-colors duration-300 ease-out ${
                active ? "text-cream" : "text-earth hover:text-olive-deep"
              }`}
            >
              <span className={LABEL}>{option.title}</span>
              <span className="font-brand-body text-[0.9375rem] leading-tight">{option.times}</span>
            </button>
          );
        })}
      </div>

      <FieldPopover
        label={overnight ? "Check-in — Check-out" : "Visit date"}
        value={dateValue}
        icon={<CalendarIcon width={18} height={18} strokeWidth={1.6} />}
        open={open === "dates"}
        onToggle={() => setOpen(open === "dates" ? null : "dates")}
        onClose={close}
        className="min-w-64 flex-[1_1_16rem]"
      >
        <RangeCalendar
          key={kind}
          kind={kind}
          windowFirst={props.windowFirst}
          windowLast={props.windowLast}
          dates={props.dates}
          checkIn={checkIn}
          nights={nights}
          maxNights={props.maxNights}
          onPick={props.onDates}
          onDone={close}
        />
      </FieldPopover>

      <FieldPopover
        label="Campers"
        value={guestSummary(guests)}
        icon={<ChevronDownIcon width={18} height={18} />}
        open={open === "campers"}
        onToggle={() => setOpen(open === "campers" ? null : "campers")}
        onClose={close}
        className="min-w-56 flex-[1_1_14rem]"
      >
        <div
          role="dialog"
          aria-label="Campers"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 flex w-85 max-w-[calc(100vw-2rem)] flex-col rounded-sm border border-oatmeal bg-cream-light px-4 pb-4 pt-1.5 shadow-float"
        >
          {GUEST_ROWS.map((row) => (
            <Counter
              key={row.key}
              label={row.label}
              hint={row.hint}
              value={guests[row.key]}
              min={0}
              max={props.guestMax(row.key)}
              onChange={(value) => props.onGuest(row.key, value)}
              className="border-b border-oatmeal py-2.5"
            />
          ))}
          <Button type="button" variant="olive" size="small" className="mt-3 self-end" onClick={close}>
            Done
          </Button>
        </div>
      </FieldPopover>

      <div className="flex min-h-14 items-center gap-3.5 rounded-xs border border-oatmeal bg-cream-light py-1.5 pl-3.5 pr-2">
        <Counter label="Tents to rent" value={tents} min={0} max={tentMax} onChange={props.onTents} className="gap-3.5" />
      </div>
    </div>
  );
}
