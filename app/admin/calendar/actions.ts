"use server";

import { revalidatePath } from "next/cache";
import {
  confirmKey,
  deleteClosure,
  findAffectedBookings,
  insertClosure,
  validateClosure,
  type ClosureInput,
  type ClosureState,
} from "@/lib/calendar";
import { formatDayWithYear } from "@/lib/stay";
import { requireAdmin } from "@/lib/supabase";

const MAX_FIELD_LENGTH = 400;
const CLOSURE_ID_PATTERN = /^\d{1,15}$/;
const BLANK: ClosureInput = { start: "", end: "", reason: "" };

const NEEDS_CONFIRM_MESSAGE =
  "Active bookings fall on these dates. Closing the dates does not cancel them: each one must be cancelled with a full refund from its booking page. Review the list, then choose Close anyway to save the closure.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.slice(0, MAX_FIELD_LENGTH) : "";
}

function state(overrides: Partial<ClosureState>): ClosureState {
  return { ok: false, message: null, errors: {}, values: BLANK, affected: [], confirmKey: "", ...overrides };
}

function rangeLabel(start: string, end: string): string {
  return start === end ? formatDayWithYear(start) : `${formatDayWithYear(start)} to ${formatDayWithYear(end)}`;
}

export async function addClosure(_previous: ClosureState, formData: FormData): Promise<ClosureState> {
  const admin = await requireAdmin();
  const input: ClosureInput = { start: text(formData, "start"), end: text(formData, "end"), reason: text(formData, "reason") };
  const checked = validateClosure(input);
  if (!checked.ok) {
    return state({ values: input, errors: checked.errors });
  }
  const { value } = checked;
  try {
    const affected = await findAffectedBookings(value.start, value.end);
    const key = confirmKey(value.start, value.end, affected);
    if (affected.length > 0 && text(formData, "confirm") !== key) {
      return state({ message: NEEDS_CONFIRM_MESSAGE, values: value, affected, confirmKey: key });
    }
    await insertClosure(value, admin.email);
  } catch (error) {
    console.error("add closure failed", error instanceof Error ? error.message : error);
    return state({ message: "Could not save the closure. Nothing was changed. Try again.", values: value });
  }
  revalidatePath("/admin/calendar");
  return state({
    ok: true,
    message: `Closed ${rangeLabel(value.start, value.end)}. New bookings are blocked for those dates.`,
  });
}

export async function removeClosure(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = text(formData, "id");
  if (!CLOSURE_ID_PATTERN.test(id)) {
    return;
  }
  await deleteClosure(Number(id));
  revalidatePath("/admin/calendar");
}
