"use server";

import { redirect } from "next/navigation";
import { countActiveSlots, createBooking, slotLabels, type CreateFailure } from "@/lib/bookings";
import {
  checkSlotCapacity,
  guestCount,
  manilaToday,
  priceBooking,
  validateDetails,
  validateStay,
  type FieldErrors,
  type GuestCounts,
  type Settings,
  type StayKind,
} from "@/lib/rules";
import { getSettings } from "@/lib/settings";
import { formatDay, type StepId } from "@/lib/stay";

export type ReserveFailure = {
  message: string;
  step: StepId;
  fieldErrors?: FieldErrors;
};

const MAX_COUNT = 1000;
const MAX_FIELD_LENGTH = 600;
const MAX_SLOTS = 20;

function fail(message: string, step: StepId, fieldErrors?: FieldErrors): ReserveFailure {
  return { message, step, fieldErrors };
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.slice(0, MAX_FIELD_LENGTH) : "";
}

function count(formData: FormData, key: string): number | null {
  const raw = text(formData, key).trim();
  if (raw === "") {
    return 0;
  }
  return /^\d{1,4}$/.test(raw) && Number(raw) <= MAX_COUNT ? Number(raw) : null;
}

function slotIdsFrom(formData: FormData): number[] | null {
  const raw = text(formData, "slots").trim();
  if (raw === "") {
    return [];
  }
  const ids = raw.split(",").map((part) => (/^\d{1,5}$/.test(part) ? Number(part) : NaN));
  if (ids.some((id) => !Number.isInteger(id) || id < 1) || ids.length > MAX_SLOTS) {
    return null;
  }
  return [...new Set(ids)];
}

function guestsFrom(formData: FormData): GuestCounts | null {
  const adults = count(formData, "adults");
  const seniors = count(formData, "seniors");
  const kids = count(formData, "kids");
  const infants = count(formData, "infants");
  if (adults === null || seniors === null || kids === null || infants === null) {
    return null;
  }
  return { adults, seniors, kids, infants };
}

async function describeFailure(failure: CreateFailure): Promise<ReserveFailure> {
  if (failure.code === "slot_taken") {
    const [label] = failure.slotId ? await slotLabels([failure.slotId]) : [];
    const which = label ?? "one of your slots";
    return fail(`Someone just booked ${which} for one of your nights. Pick another slot.`, "slots");
  }
  if (failure.code === "site_full") {
    return fail(`We're full on ${formatDay(failure.date)}. Pick other dates.`, "dates");
  }
  if (failure.code === "tents_unavailable") {
    return fail(`Not enough tents are left on ${formatDay(failure.date)}. Choose fewer tents.`, "guests");
  }
  if (failure.code === "closed") {
    return fail("The campsite is closed on one of those dates. Pick other dates.", "dates");
  }
  return fail("We could not complete your booking. Please check your choices and try again.", "review");
}

function checkChoices(
  formData: FormData,
  kind: StayKind,
  today: string,
  settings: Settings,
): ReserveFailure | { nights: number } {
  const nights = kind === "day_tour" ? 0 : (count(formData, "nights") ?? 0);
  const stay = validateStay({ kind, checkIn: text(formData, "checkIn"), nights }, today, settings);
  if (!stay.ok) {
    return fail(Object.values(stay.errors)[0], "dates");
  }
  return { nights };
}

export async function reserve(formData: FormData): Promise<ReserveFailure> {
  const kindValue = text(formData, "kind");
  if (kindValue !== "overnight" && kindValue !== "day_tour") {
    return fail("Choose overnight or day tour.", "type");
  }
  const kind: StayKind = kindValue;
  const settings = await getSettings();
  const checked = checkChoices(formData, kind, manilaToday(), settings);
  if ("message" in checked) {
    return checked;
  }
  const { nights } = checked;
  const checkIn = text(formData, "checkIn");

  const guests = guestsFrom(formData);
  const tents = kind === "overnight" ? count(formData, "tents") : 0;
  if (guests === null || tents === null) {
    return fail("Check the number of guests and tents.", "guests");
  }
  const guestTotal = guestCount(guests);
  if (guestTotal < 1) {
    return fail("Add at least one guest.", "guests");
  }
  if (tents > settings.tentStock) {
    return fail(`We have ${settings.tentStock} tents in total. Choose fewer tents.`, "guests");
  }

  const slotIds = kind === "overnight" ? slotIdsFrom(formData) : [];
  if (slotIds === null) {
    return fail("Check the slots you chose.", "slots");
  }
  if (kind === "overnight") {
    if (slotIds.length === 0) {
      return fail("Choose at least one slot.", "slots");
    }
    const capacity = checkSlotCapacity(guestTotal, slotIds.length, settings);
    if (!capacity.ok) {
      return fail(`${guestTotal} guests need at least ${capacity.neededSlots} slots. Add a slot.`, "slots");
    }
    if ((await countActiveSlots(slotIds)) !== slotIds.length) {
      return fail("One of the slots you chose is not available. Pick another slot.", "slots");
    }
  }

  const details = validateDetails({
    name: text(formData, "name"),
    email: text(formData, "email"),
    mobile: text(formData, "mobile"),
    notes: text(formData, "notes"),
    agreeRules: text(formData, "agreeRules") === "yes",
    agreePrivacy: text(formData, "agreePrivacy") === "yes",
  });
  if (!details.ok) {
    return fail("Check your details.", "details", details.errors);
  }

  const quote = priceBooking({ kind, nights, tents, ...guests }, settings);
  if (quote.total < 1) {
    return fail("Add at least one adult, senior or child aged 4 to 12.", "guests");
  }

  const result = await createBooking({
    kind,
    checkIn,
    nights,
    ...details.values,
    guests,
    tents,
    slotIds,
    quote,
  });
  if (!result.ok) {
    return describeFailure(result);
  }
  redirect(`/b/${result.token}`);
}
