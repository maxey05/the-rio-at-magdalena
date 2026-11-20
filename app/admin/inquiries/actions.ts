"use server";

import { revalidatePath } from "next/cache";
import { actionFailed, actionHandled, isUuid, runAction, type AdminActionState } from "@/lib/admin";
import {
  canTransition,
  changeInquiryStatus,
  INQUIRY_NOTE_MAX,
  isInquiryStatus,
  saveInquiryNote,
} from "@/lib/inquiries";
import { normalizeNewlines } from "@/lib/rules";
import { requireAdmin } from "@/lib/supabase";

const NOT_FOUND = "Inquiry not found.";
const HANDLED = "Already handled. This inquiry was changed by someone else, so nothing was changed.";

export async function setInquiryStatus(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const id = formData.get("inquiryId");
  const expected = formData.get("expected");
  const next = formData.get("next");
  if (!isUuid(id) || !isInquiryStatus(expected) || !isInquiryStatus(next) || !canTransition(expected, next)) {
    return actionFailed(NOT_FOUND);
  }
  return runAction(async () => {
    const changed = await changeInquiryStatus(id, expected, next);
    revalidatePath("/admin/inquiries");
    return changed ? { ok: true, message: null } : actionHandled(HANDLED);
  });
}

export async function saveNote(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const id = formData.get("inquiryId");
  const note = normalizeNewlines(String(formData.get("note") ?? "")).trim();
  if (!isUuid(id)) {
    return actionFailed(NOT_FOUND);
  }
  if (note.length > INQUIRY_NOTE_MAX) {
    return actionFailed(null, { note: `Keep the note to ${INQUIRY_NOTE_MAX} characters or fewer.` });
  }
  return runAction(async () => {
    const saved = await saveInquiryNote(id, note);
    if (!saved) {
      return actionFailed(NOT_FOUND);
    }
    revalidatePath("/admin/inquiries");
    return { ok: true, message: "Note saved." };
  });
}
