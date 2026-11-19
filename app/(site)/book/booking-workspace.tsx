"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/button";
import { DateCalendar } from "@/components/date-calendar";
import { Field, FieldError, CheckboxField, TextAreaField } from "@/components/field";
import { InfoCallout } from "@/components/info-callout";
import { MoonIcon, TentIcon } from "@/components/icons";
import { SlotPicker } from "@/components/slot-picker";
import { Stepper } from "@/components/stepper";
import { SummaryPanel, SummarySheet, type SummaryData } from "@/components/summary-panel";
import { noWalkInsNotice, stayTimes } from "@/lib/content";
import {
  addDays,
  bookingWindow,
  checkSlotCapacity,
  formatPeso,
  guestCount,
  priceBooking,
  validateDetails,
  validateStay,
  type DetailsForm,
  type FieldErrors,
  type GuestCounts,
  type Settings,
  type StayKind,
} from "@/lib/rules";
import {
  formatDay,
  selectionQuery,
  slotLabel,
  stayLimits,
  visibleSteps,
  type AvailabilityResponse,
  type Selection,
  type StepId,
} from "@/lib/stay";
import { reserve, type ReserveFailure } from "./actions";

type WorkspaceProps = {
  settings: Settings;
  today: string;
  initial: Selection;
};

type Loaded = {
  kind: StayKind;
  key: string;
  data: AvailabilityResponse;
};

const STEP_TITLES: Record<StepId, string> = {
  type: "Type of visit",
  dates: "Dates",
  slots: "Camp and slots",
  guests: "Guests and tents",
  details: "Your details",
  review: "Review and reserve",
};

const EMPTY_DETAILS: DetailsForm = {
  name: "",
  email: "",
  mobile: "",
  notes: "",
  agreeRules: false,
  agreePrivacy: false,
};

const DETAIL_FIELD_ORDER = ["name", "email", "mobile", "notes", "agreeRules", "agreePrivacy"] as const;

function initialStep(initial: Selection): StepId {
  if (initial.kind === null) {
    return "type";
  }
  if (initial.checkIn === null) {
    return "dates";
  }
  if (initial.kind === "overnight" && initial.slotIds.length === 0) {
    return "slots";
  }
  return "guests";
}

type StepCardProps = {
  id: StepId;
  number: number;
  open: boolean;
  summary: string | null;
  onEdit: () => void;
  children: ReactNode;
};

function StepCard({ id, number, open, summary, onEdit, children }: StepCardProps) {
  return (
    <section
      id={`step-${id}`}
      aria-labelledby={`step-${id}-title`}
      className="scroll-mt-6 rounded-card border border-line bg-surface p-5 md:p-6"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-moss-strong text-small font-bold text-surface"
        >
          {number}
        </span>
        <h2 id={`step-${id}-title`} className="flex-1 font-sans text-h3 font-bold">
          {STEP_TITLES[id]}
        </h2>
        {!open && summary ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${STEP_TITLES[id].toLowerCase()}`}
            className="inline-flex min-h-11 items-center rounded-full px-4 text-small font-bold text-moss-strong underline underline-offset-4 hover:bg-moss-soft"
          >
            Edit
          </button>
        ) : null}
      </div>
      {!open && summary ? <p className="mt-2 pl-11 text-ink-muted">{summary}</p> : null}
      {open ? <div className="mt-5 flex flex-col gap-5">{children}</div> : null}
    </section>
  );
}

export function BookingWorkspace({ settings, today, initial }: WorkspaceProps) {
  const bookable = useMemo(() => bookingWindow(today, settings), [today, settings]);
  const [kind, setKind] = useState<StayKind | null>(initial.kind);
  const [checkIn, setCheckIn] = useState<string | null>(initial.checkIn);
  const [nights, setNights] = useState(initial.nights);
  const [slotIds, setSlotIds] = useState<number[]>(initial.slotIds);
  const [guests, setGuests] = useState<GuestCounts>({ adults: 1, seniors: 0, kids: 0, infants: 0 });
  const [tents, setTents] = useState(0);
  const [details, setDetails] = useState<DetailsForm>(EMPTY_DETAILS);
  const [detailErrors, setDetailErrors] = useState<FieldErrors>({});
  const [step, setStep] = useState<StepId>(() => initialStep(initial));
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [failure, setFailure] = useState<ReserveFailure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: string; n: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const scrolled = useRef(false);
  const slotIdsRef = useRef(slotIds);

  const stayCount = kind === "day_tour" ? 0 : nights;
  const queryKey = `${kind ?? ""}|${kind === "overnight" ? `${checkIn ?? ""}|${nights}` : ""}|${refreshKey}`;
  const dates = loaded && loaded.kind === kind ? loaded.data.dates : null;
  const slots = loaded && loaded.key === queryKey ? (loaded.data.slots ?? null) : null;
  const steps = visibleSteps(kind);

  useEffect(() => {
    if (!kind) {
      return;
    }
    const controller = new AbortController();
    const query = new URLSearchParams({ type: kind });
    if (kind === "overnight" && checkIn) {
      query.set("in", checkIn);
      query.set("n", String(nights));
    }
    fetch(`/book/availability?${query.toString()}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<AvailabilityResponse>) : Promise.reject(new Error("bad response"))))
      .then((data) => {
        setLoaded({ kind, key: queryKey, data });
        setLoadFailed(false);
        if (checkIn) {
          const limits = stayLimits(data.dates, checkIn, nights, kind, settings);
          const usable = kind === "overnight" ? limits.maxNights >= 1 : limits.maxGuests >= 1;
          if (!usable) {
            setCheckIn(null);
            setNotice(`${formatDay(checkIn)} is no longer available. Pick another date.`);
          } else if (kind === "overnight" && nights > limits.maxNights) {
            setNights(limits.maxNights);
          }
        }
        if (data.slots) {
          const free = new Set(data.slots.filter((slot) => slot.free).map((slot) => slot.id));
          const kept = slotIdsRef.current.filter((id) => free.has(id));
          if (kept.length < slotIdsRef.current.length) {
            setSlotIds(kept);
            setNotice("A slot you chose was just taken. Please check your slots.");
          }
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLoadFailed(true);
        }
      });
    return () => controller.abort();
  }, [kind, checkIn, nights, refreshKey, queryKey, settings]);

  useEffect(() => {
    slotIdsRef.current = slotIds;
  }, [slotIds]);

  useEffect(() => {
    const query = selectionQuery({ kind, checkIn, nights, slotIds });
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [kind, checkIn, nights, slotIds]);

  useEffect(() => {
    if (!scrolled.current) {
      scrolled.current = true;
      return;
    }
    document.getElementById(`step-${step}`)?.scrollIntoView({ block: "start" });
  }, [step]);

  useEffect(() => {
    if (focusRequest) {
      document.getElementById(focusRequest.id)?.focus();
    }
  }, [focusRequest]);

  const limits = kind && checkIn && dates ? stayLimits(dates, checkIn, nights, kind, settings) : null;
  const stayValid = kind !== null && checkIn !== null && validateStay({ kind, checkIn, nights: stayCount }, today, settings).ok;
  const stayOk = stayValid && limits !== null && (kind === "overnight" ? limits.maxNights >= 1 : limits.maxGuests >= 1);
  const guestTotal = guestCount(guests);
  const capacity = checkSlotCapacity(guestTotal, slotIds.length, settings);
  const quote =
    kind && stayOk
      ? priceBooking({ kind, nights: kind === "overnight" ? nights : 1, tents: kind === "overnight" ? tents : 0, ...guests }, settings)
      : null;

  const guestsError = (() => {
    if (guestTotal < 1) {
      return "Add at least one guest.";
    }
    if (quote !== null && quote.total < 1) {
      return "Add at least one adult, senior or child aged 4 to 12.";
    }
    if (kind === "overnight" && slotIds.length > 0 && !capacity.ok) {
      return `${guestTotal} guests need at least ${capacity.neededSlots} slots, and you chose ${slotIds.length}.`;
    }
    if (limits !== null && guestTotal > limits.maxGuests) {
      return `Only ${limits.maxGuests} more ${limits.maxGuests === 1 ? "guest fits" : "guests fit"} on your dates.`;
    }
    return null;
  })();

  const detailsCheck = validateDetails(details);
  const complete: Record<StepId, boolean> = {
    type: kind !== null,
    dates: stayOk,
    slots: slotIds.length > 0 && slots !== null,
    guests: guestsError === null && stayOk,
    details: detailsCheck.ok,
    review: false,
  };
  const ready = steps.filter((id) => id !== "review").every((id) => complete[id]);

  const slotNames =
    slots === null
      ? []
      : slots.filter((slot) => slotIds.includes(slot.id)).map((slot) => slotLabel(slot.camp, slot.code));

  const summaryData: SummaryData = { kind, checkIn, nights, slotLabels: slotNames, guests, tents, quote };

  function summaryFor(id: StepId): string | null {
    if (!complete[id]) {
      return null;
    }
    if (id === "type") {
      return kind === "overnight" ? "Overnight stay" : "Day tour";
    }
    if (id === "dates" && checkIn) {
      return kind === "overnight"
        ? `${formatDay(checkIn)} to ${formatDay(addDays(checkIn, nights))}, ${nights} ${nights === 1 ? "night" : "nights"}`
        : formatDay(checkIn);
    }
    if (id === "slots") {
      return slotNames.length > 0 ? slotNames.join(", ") : `${slotIds.length} slots`;
    }
    if (id === "guests") {
      const tentText = kind === "overnight" ? `, ${tents} ${tents === 1 ? "tent" : "tents"}` : "";
      return `${guestTotal} ${guestTotal === 1 ? "guest" : "guests"}${tentText}`;
    }
    if (id === "details") {
      return `${details.name.trim()}, ${details.email.trim()}`;
    }
    return null;
  }

  function goTo(next: StepId) {
    setFailure(null);
    setNotice(null);
    setStep(next);
  }

  function chooseKind(next: StayKind) {
    if (next !== kind) {
      setKind(next);
      setSlotIds([]);
      setTents(0);
      setNights(1);
      setCheckIn(null);
    }
    goTo("dates");
  }

  function toggleSlot(id: number) {
    setNotice(null);
    setSlotIds((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));
  }

  function setGuest(key: keyof GuestCounts, value: number) {
    setGuests((current) => ({ ...current, [key]: value }));
  }

  function setDetail<K extends keyof DetailsForm>(key: K, value: DetailsForm[K]) {
    setDetails((current) => ({ ...current, [key]: value }));
    setDetailErrors((current) =>
      key in current ? Object.fromEntries(Object.entries(current).filter(([name]) => name !== key)) : current,
    );
  }

  function requestFocus(id: string) {
    setFocusRequest((current) => ({ id, n: (current?.n ?? 0) + 1 }));
  }

  function showDetailErrors(errors: FieldErrors) {
    setDetailErrors(errors);
    const first = DETAIL_FIELD_ORDER.find((key) => errors[key]);
    if (first) {
      requestFocus(`details-${first}`);
    }
  }

  function continueFrom(from: StepId) {
    if (from === "details" && !detailsCheck.ok) {
      showDetailErrors(detailsCheck.errors);
      return;
    }
    if (!complete[from]) {
      return;
    }
    goTo(steps[steps.indexOf(from) + 1]);
  }

  function goToFirstOpenStep() {
    goTo(steps.find((id) => id !== "review" && !complete[id]) ?? "review");
  }

  function buildFormData(): FormData {
    const data = new FormData();
    data.set("kind", kind ?? "");
    data.set("checkIn", checkIn ?? "");
    data.set("nights", String(stayCount));
    data.set("slots", kind === "overnight" ? slotIds.join(",") : "");
    data.set("adults", String(guests.adults));
    data.set("seniors", String(guests.seniors));
    data.set("kids", String(guests.kids));
    data.set("infants", String(guests.infants));
    data.set("tents", String(kind === "overnight" ? tents : 0));
    data.set("name", details.name);
    data.set("email", details.email);
    data.set("mobile", details.mobile);
    data.set("notes", details.notes);
    data.set("agreeRules", details.agreeRules ? "yes" : "no");
    data.set("agreePrivacy", details.agreePrivacy ? "yes" : "no");
    return data;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== "review") {
      continueFrom(step);
      return;
    }
    if (!ready || pending) {
      return;
    }
    setFailure(null);
    setNotice(null);
    startTransition(async () => {
      const result = await reserve(buildFormData());
      setFailure(result);
      setStep(result.step);
      setRefreshKey((value) => value + 1);
      if (result.fieldErrors) {
        showDetailErrors(result.fieldErrors);
      }
    });
  }

  const numberOf = (id: StepId) => steps.indexOf(id) + 1;
  const stayEnd = checkIn && kind === "overnight" ? addDays(checkIn, nights) : null;
  const siteMax = limits?.maxGuests ?? settings.siteCap;
  const guestMax = (key: keyof GuestCounts) => Math.max(0, siteMax - (guestTotal - guests[key]));

  function continueButton(from: StepId, hint: string, enabled: boolean) {
    return (
      <div className="flex flex-col gap-2">
        <Button type="button" onClick={() => continueFrom(from)} disabled={!enabled} className="self-start">
          Continue
        </Button>
        {!enabled ? <p className="text-small text-ink-muted">{hint}</p> : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-page px-4 pb-32 pt-8 md:px-8 md:pt-12 lg:pb-16">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <InfoCallout title={noWalkInsNotice.title}>
            <p>{noWalkInsNotice.body}</p>
          </InfoCallout>
          {failure ? <FieldError error={failure.message} /> : null}
          {notice ? (
            <p role="status" className="rounded-input bg-warning-soft p-3 text-small font-medium text-warning-strong">
              {notice}
            </p>
          ) : null}

          <StepCard id="type" number={numberOf("type")} open={step === "type"} summary={summaryFor("type")} onEdit={() => goTo("type")}>
            <div role="group" aria-label="Type of visit" className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { value: "overnight", title: "Overnight stay", times: stayTimes.overnight, icon: <MoonIcon /> },
                  { value: "day_tour", title: "Day tour", times: stayTimes.dayTour, icon: <TentIcon /> },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={kind === option.value}
                  onClick={() => chooseKind(option.value)}
                  className={`flex min-h-24 flex-col items-start gap-1 rounded-card border p-4 text-left transition-colors duration-150 ease-out ${
                    kind === option.value ? "border-moss bg-moss-tint" : "border-line bg-surface hover:bg-moss-soft"
                  }`}
                >
                  <span className="flex items-center gap-2 text-h3 font-bold">
                    {option.icon}
                    {option.title}
                  </span>
                  <span className="text-small text-ink-muted">{option.times}</span>
                </button>
              ))}
            </div>
          </StepCard>

          <StepCard id="dates" number={numberOf("dates")} open={step === "dates"} summary={summaryFor("dates")} onEdit={() => goTo("dates")}>
            {kind === null ? (
              <p className="text-ink-muted">Choose a type of visit first.</p>
            ) : (
              <>
                <p className="text-ink-muted">
                  {kind === "overnight"
                    ? `Pick your check-in date. You can book from tomorrow up to ${formatDay(bookable.last)}.`
                    : `Pick the day of your visit. You can book from tomorrow up to ${formatDay(bookable.last)}.`}
                </p>
                {loadFailed ? (
                  <div className="flex flex-col items-start gap-2">
                    <FieldError error="We could not load availability. Check your connection and try again." />
                    <Button type="button" size="small" variant="secondary" onClick={() => setRefreshKey((value) => value + 1)}>
                      Try again
                    </Button>
                  </div>
                ) : null}
                <DateCalendar
                  windowFirst={bookable.first}
                  windowLast={bookable.last}
                  dates={dates}
                  kind={kind}
                  checkIn={checkIn}
                  nights={nights}
                  onSelect={(date) => {
                    setNotice(null);
                    setCheckIn(date);
                  }}
                />
                {kind === "overnight" && checkIn ? (
                  <div className="flex flex-col gap-2">
                    <Stepper
                      id="nights"
                      label="Nights"
                      value={nights}
                      min={1}
                      max={limits?.maxNights ?? settings.maxNights}
                      onChange={setNights}
                      hint={limits ? `Up to ${limits.maxNights} from this date` : undefined}
                    />
                    {stayEnd ? (
                      <p className="text-small text-ink-muted">
                        Check-in {stayTimes.checkIn}, check-out {stayTimes.checkOut} on {formatDay(stayEnd)}.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {continueButton("dates", "Choose an available date to continue.", complete.dates)}
              </>
            )}
          </StepCard>

          {kind !== "day_tour" ? (
            <StepCard id="slots" number={numberOf("slots")} open={step === "slots"} summary={summaryFor("slots")} onEdit={() => goTo("slots")}>
              {!stayOk ? (
                <p className="text-ink-muted">Choose your dates first.</p>
              ) : (
                <>
                  <p className="text-ink-muted">
                    Each slot fits up to {settings.slotCapacity} guests and is yours alone for the whole stay. Bigger groups pick more than
                    one slot.
                  </p>
                  {loadFailed ? <FieldError error="We could not load slots. Go back to the dates step and try again." /> : null}
                  <SlotPicker slots={slots} selected={slotIds} slotCapacity={settings.slotCapacity} onToggle={toggleSlot} />
                  {continueButton("slots", "Choose at least one free slot to continue.", complete.slots)}
                </>
              )}
            </StepCard>
          ) : null}

          <StepCard id="guests" number={numberOf("guests")} open={step === "guests"} summary={summaryFor("guests")} onEdit={() => goTo("guests")}>
            <div className="flex flex-col gap-4">
              <Stepper id="adults" label="Adults" hint="Ages 13 to 59" value={guests.adults} min={0} max={guestMax("adults")} onChange={(value) => setGuest("adults", value)} />
              <Stepper id="seniors" label="Seniors" hint="60 and above" value={guests.seniors} min={0} max={guestMax("seniors")} onChange={(value) => setGuest("seniors", value)} />
              <Stepper id="kids" label="Children 4 to 12" value={guests.kids} min={0} max={guestMax("kids")} onChange={(value) => setGuest("kids", value)} />
              <Stepper
                id="infants"
                label="Children 3 and below"
                hint="Free, but they count toward limits"
                value={guests.infants}
                min={0}
                max={guestMax("infants")}
                onChange={(value) => setGuest("infants", value)}
              />
              {kind === "overnight" ? (
                <Stepper
                  id="tents"
                  label="Tents to rent"
                  hint={`${formatPeso(settings.tentPrice)} per tent, per night`}
                  value={tents}
                  min={0}
                  max={limits?.maxTents ?? settings.tentStock}
                  onChange={setTents}
                />
              ) : null}
            </div>
            <FieldError error={guestsError ?? undefined} />
            {kind === "overnight" && slotIds.length > 0 && !capacity.ok && guestTotal > 0 ? (
              <Button type="button" variant="secondary" size="small" className="self-start" onClick={() => goTo("slots")}>
                Choose more slots
              </Button>
            ) : null}
            {continueButton("guests", "Fix the guests above to continue.", complete.guests)}
          </StepCard>

          <StepCard id="details" number={numberOf("details")} open={step === "details"} summary={summaryFor("details")} onEdit={() => goTo("details")}>
            <Field
              id="details-name"
              label="Full name"
              autoComplete="name"
              value={details.name}
              error={detailErrors.name}
              onChange={(event) => setDetail("name", event.target.value)}
            />
            <Field
              id="details-email"
              label="Email"
              type="email"
              autoComplete="email"
              hint="Your confirmation is sent here."
              value={details.email}
              error={detailErrors.email}
              onChange={(event) => setDetail("email", event.target.value)}
            />
            <Field
              id="details-mobile"
              label="Mobile number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              hint="Philippine number, like 0917 123 4567."
              value={details.mobile}
              error={detailErrors.mobile}
              onChange={(event) => setDetail("mobile", event.target.value)}
            />
            <TextAreaField
              id="details-notes"
              label="Notes (optional)"
              value={details.notes}
              error={detailErrors.notes}
              onChange={(event) => setDetail("notes", event.target.value)}
            />
            <CheckboxField
              id="details-agreeRules"
              checked={details.agreeRules}
              error={detailErrors.agreeRules}
              onChange={(event) => setDetail("agreeRules", event.target.checked)}
            >
              I agree to the{" "}
              <Link href="/rules" target="_blank" className="font-bold text-moss-strong underline underline-offset-4">
                house rules
              </Link>
              .
            </CheckboxField>
            <CheckboxField
              id="details-agreePrivacy"
              checked={details.agreePrivacy}
              error={detailErrors.agreePrivacy}
              onChange={(event) => setDetail("agreePrivacy", event.target.checked)}
            >
              I agree to the{" "}
              <Link href="/privacy" target="_blank" className="font-bold text-moss-strong underline underline-offset-4">
                privacy notice
              </Link>
              .
            </CheckboxField>
            <Button type="button" onClick={() => continueFrom("details")} className="self-start">
              Continue
            </Button>
          </StepCard>

          <StepCard id="review" number={numberOf("review")} open={step === "review"} summary={null} onEdit={() => goTo("review")}>
            <div className="lg:hidden">
              <SummaryPanel data={summaryData} />
            </div>
            <p>
              Your {kind === "overnight" ? "slots are" : "spot is"} held for {settings.holdMinutes} minutes after you reserve. Pay the{" "}
              {quote ? formatPeso(quote.downpayment) : "downpayment"} downpayment by GCash on the next page and upload your receipt to keep
              your booking. The rest is paid at check-in.
            </p>
            <Button type="submit" disabled={!ready || pending} className="self-start">
              {pending ? "Reserving..." : "Reserve and pay with GCash"}
            </Button>
            {!ready ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-small text-ink-muted">Finish the earlier steps to reserve.</p>
                <Button type="button" variant="secondary" size="small" onClick={goToFirstOpenStep}>
                  Go to the next step to finish
                </Button>
              </div>
            ) : null}
          </StepCard>
        </div>
        <aside aria-label="Booking summary" className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-6">
            <SummaryPanel data={summaryData} />
          </div>
        </aside>
      </div>
      <SummarySheet data={summaryData} onReview={goToFirstOpenStep} />
    </form>
  );
}
