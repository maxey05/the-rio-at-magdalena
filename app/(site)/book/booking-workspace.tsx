"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { BookingSteps } from "@/components/booking-steps";
import { PAGE_TITLE } from "@/components/brand-styles";
import { Button } from "@/components/button";
import { CampMap } from "@/components/camp-map";
import { FieldError } from "@/components/field";
import { TopLoadingBar } from "@/components/top-loading-bar";
import {
  bookingWindow,
  checkSlotCapacity,
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
import { formatDay, selectionQuery, stayLimits, type AvailabilityResponse, type Selection } from "@/lib/stay";
import { reserve } from "./actions";
import { BookingBar } from "./booking-bar";
import { BookingSummary } from "./booking-summary";
import { DetailsStep } from "./details-step";

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

type Stage = "stay" | "details";

const EMPTY_DETAILS: DetailsForm = {
  name: "",
  email: "",
  mobile: "",
  notes: "",
  agreeRules: false,
  agreePrivacy: false,
};

const DETAIL_FIELD_ORDER = ["name", "email", "mobile", "notes", "agreeRules", "agreePrivacy"] as const;

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function BookingWorkspace({ settings, today, initial }: WorkspaceProps) {
  const bookable = useMemo(() => bookingWindow(today, settings), [today, settings]);
  const [kind, setKind] = useState<StayKind>(initial.kind ?? "overnight");
  const [checkIn, setCheckIn] = useState<string | null>(initial.checkIn);
  const [nights, setNights] = useState(initial.nights);
  const [slotIds, setSlotIds] = useState<number[]>(initial.slotIds);
  const [guests, setGuests] = useState<GuestCounts>({ adults: 1, seniors: 0, kids: 0, infants: 0 });
  const [tents, setTents] = useState(0);
  const [details, setDetails] = useState<DetailsForm>(EMPTY_DETAILS);
  const [detailErrors, setDetailErrors] = useState<FieldErrors>({});
  const [stage, setStage] = useState<Stage>("stay");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: string; n: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const [direction, setDirection] = useState<"forward" | "back" | null>(null);
  const [switching, setSwitching] = useState(false);
  const switchTimer = useRef<number | null>(null);
  const mounted = useRef(false);
  const slotIdsRef = useRef(slotIds);

  const stayCount = kind === "day_tour" ? 0 : nights;
  const queryKey = `${kind}|${checkIn ?? ""}|${stayCount}|${refreshKey}`;
  const dates = loaded && loaded.kind === kind ? loaded.data.dates : null;
  const slots = checkIn !== null && loaded && loaded.kind === kind ? (loaded.data.slots ?? null) : null;
  const slotsFresh = loaded !== null && loaded.key === queryKey;

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ type: kind });
    if (checkIn) {
      query.set("in", checkIn);
      query.set("n", String(stayCount));
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
  }, [kind, checkIn, nights, stayCount, refreshKey, queryKey, settings]);

  useEffect(() => {
    slotIdsRef.current = slotIds;
  }, [slotIds]);

  useEffect(() => {
    return () => {
      if (switchTimer.current !== null) {
        window.clearTimeout(switchTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const query = selectionQuery({ kind, checkIn, nights, slotIds });
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [kind, checkIn, nights, slotIds]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    window.scrollTo({ top: 0 });
  }, [stage]);

  useEffect(() => {
    if (focusRequest) {
      document.getElementById(focusRequest.id)?.focus();
    }
  }, [focusRequest]);

  const limits = checkIn && dates ? stayLimits(dates, checkIn, nights, kind, settings) : null;
  const stayValid = checkIn !== null && validateStay({ kind, checkIn, nights: stayCount }, today, settings).ok;
  const stayOk = stayValid && limits !== null && (kind === "overnight" ? limits.maxNights >= 1 : limits.maxGuests >= 1);
  const guestTotal = guestCount(guests);
  const capacity = checkSlotCapacity(guestTotal, slotIds.length, settings);
  const tentMax = limits?.maxTents ?? settings.tentStock;
  const tentsUsed = Math.min(tents, tentMax);
  const quote = stayOk ? priceBooking({ kind, nights: kind === "overnight" ? nights : 1, tents: tentsUsed, ...guests }, settings) : null;
  const availabilityLoading = !loadFailed && !(loaded !== null && loaded.key === queryKey);

  const guestsError = (() => {
    if (guestTotal < 1) {
      return "Add at least one camper.";
    }
    if (quote !== null && quote.total < 1) {
      return "Add at least one adult, senior or child aged 4 to 12.";
    }
    if (limits !== null && guestTotal > limits.maxGuests) {
      return `Only ${limits.maxGuests} more ${limits.maxGuests === 1 ? "camper fits" : "campers fit"} on your dates.`;
    }
    return null;
  })();

  const slotWarning = (() => {
    if (!stayOk || guestTotal < 1 || capacity.ok) {
      return null;
    }
    const missing = capacity.neededSlots - slotIds.length;
    const who = `${plural(guestTotal, "camper needs", "campers need")} at least ${plural(capacity.neededSlots, "slot", "slots")}.`;
    return slotIds.length === 0 ? `${who} Pick ${missing} on the map.` : `${who} Pick ${missing} more on the map.`;
  })();

  const warning = guestsError ?? slotWarning;
  const slotsReady = slotIds.length > 0 && capacity.ok && slotsFresh;
  const canContinue = stayOk && guestsError === null && slotsReady;

  const slotChips = (slots ?? []).filter((slot) => slotIds.includes(slot.id)).map((slot) => ({ id: slot.id, label: slot.code }));

  const mapNote = checkIn === null ? "Choose your dates to see which slots are free." : null;

  function chooseKind(next: StayKind) {
    if (next === kind) {
      return;
    }
    setKind(next);
    setSlotIds([]);
    setNights(1);
    setNotice(null);
    setFailure(null);
  }

  function goTo(next: Stage) {
    if (next === stage) {
      return;
    }
    setDirection(next === "details" ? "forward" : "back");
    setStage(next);
    setSwitching(true);
    if (switchTimer.current !== null) {
      window.clearTimeout(switchTimer.current);
    }
    switchTimer.current = window.setTimeout(() => setSwitching(false), 450);
  }

  function chooseDates(nextCheckIn: string, nextNights: number) {
    setNotice(null);
    setFailure(null);
    setCheckIn(nextCheckIn);
    setNights(nextNights);
  }

  function toggleSlot(id: number) {
    setNotice(null);
    setFailure(null);
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

  function showDetailErrors(errors: FieldErrors) {
    setDetailErrors(errors);
    const first = DETAIL_FIELD_ORDER.find((key) => errors[key]);
    if (first) {
      setFocusRequest((current) => ({ id: `details-${first}`, n: (current?.n ?? 0) + 1 }));
    }
  }

  function buildFormData(): FormData {
    const data = new FormData();
    data.set("kind", kind);
    data.set("checkIn", checkIn ?? "");
    data.set("nights", String(stayCount));
    data.set("slots", slotIds.join(","));
    data.set("adults", String(guests.adults));
    data.set("seniors", String(guests.seniors));
    data.set("kids", String(guests.kids));
    data.set("infants", String(guests.infants));
    data.set("tents", String(tentsUsed));
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
    if (pending) {
      return;
    }
    const check = validateDetails(details);
    if (!check.ok) {
      showDetailErrors(check.errors);
      return;
    }
    setFailure(null);
    setNotice(null);
    startTransition(async () => {
      const result = await reserve(buildFormData());
      setFailure(result.message);
      goTo(result.step === "details" || result.step === "review" ? "details" : "stay");
      setRefreshKey((value) => value + 1);
      if (result.fieldErrors) {
        showDetailErrors(result.fieldErrors);
      }
    });
  }

  const siteMax = limits?.maxGuests ?? settings.siteCap;
  const guestMax = (key: keyof GuestCounts) => Math.max(0, siteMax - (guestTotal - guests[key]));

  const messages = (
    <>
      {failure ? <FieldError error={failure} /> : null}
      {notice ? (
        <p role="status" className="rounded-xs bg-warning-soft px-3 py-2 text-base font-semibold text-warning-strong">
          {notice}
        </p>
      ) : null}
    </>
  );

  return (
    <div className="bg-cream font-brand-body text-[1.125rem] text-earth">
      <TopLoadingBar active={availabilityLoading || pending || switching} />
      <div className="mx-auto max-w-page px-4 pb-16 pt-8 md:px-8 md:pt-10">
        <div
          key={stage}
          className={`flex flex-col gap-5 ${direction === null ? "" : direction === "forward" ? "screen-forward" : "screen-back"}`}
        >
          <div className="flex flex-col gap-3">
            <h1 className={PAGE_TITLE}>{stage === "stay" ? "Book your stay" : "Your details"}</h1>
            <BookingSteps active={stage === "stay" ? 1 : 2} />
          </div>

          {stage === "stay" ? (
            <>
              <BookingBar
                kind={kind}
                onKind={chooseKind}
                checkIn={checkIn}
                nights={nights}
                dates={dates}
                windowFirst={bookable.first}
                windowLast={bookable.last}
                maxNights={limits?.maxNights ?? settings.maxNights}
                onDates={chooseDates}
                guests={guests}
                guestMax={guestMax}
                onGuest={setGuest}
                tents={tentsUsed}
                tentMax={tentMax}
                onTents={setTents}
              />
              {loadFailed ? (
                <div className="flex flex-wrap items-center gap-3">
                  <FieldError error="We could not load availability. Check your connection and try again." />
                  <Button type="button" size="small" variant="ghost-earth" onClick={() => setRefreshKey((value) => value + 1)}>
                    Try again
                  </Button>
                </div>
              ) : null}
              {messages}
              <div className="flex flex-wrap items-start gap-5">
                <div className="min-w-0 flex-[999_1_37.5rem]">
                  <CampMap slots={slots} selected={slotIds} slotCapacity={settings.slotCapacity} note={mapNote} onToggle={toggleSlot} />
                </div>
                <BookingSummary
                  kind={kind}
                  checkIn={checkIn}
                  nights={nights}
                  guests={guests}
                  slotChips={slotChips}
                  onRemoveSlot={toggleSlot}
                  quote={quote}
                  downpaymentPct={settings.downpaymentPct}
                  warning={warning}
                >
                  <Button
                    type="button"
                    variant="olive"
                    arrow
                    disabled={!canContinue}
                    onClick={() => {
                      setFailure(null);
                      setNotice(null);
                      goTo("details");
                    }}
                    className="w-full"
                  >
                    Continue
                  </Button>
                </BookingSummary>
              </div>
            </>
          ) : (
            <>
              {messages}
              <div className="flex flex-wrap items-start gap-5">
                <DetailsStep details={details} errors={detailErrors} pending={pending} onChange={setDetail} onSubmit={onSubmit} />
                <BookingSummary
                  kind={kind}
                  checkIn={checkIn}
                  nights={nights}
                  guests={guests}
                  slotChips={slotChips}
                  quote={quote}
                  downpaymentPct={settings.downpaymentPct}
                  warning={null}
                  headerAction={
                    <button
                      type="button"
                      onClick={() => goTo("stay")}
                      className="font-brand-label text-overline font-semibold uppercase tracking-button text-olive-strong underline underline-offset-3 hover:text-olive-deep"
                    >
                      Edit
                    </button>
                  }
                >
                  <p className="text-base text-earth-muted">
                    Your slots are held for {settings.holdMinutes} minutes after you reserve. You pay the downpayment on the next page.
                  </p>
                </BookingSummary>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
