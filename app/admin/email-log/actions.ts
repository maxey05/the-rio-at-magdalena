"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailed,
  actionHandled,
  emailRelevant,
  emailSiblings,
  getBooking,
  getEmailLogRow,
  isUuid,
  needsResend,
  runAction,
  type AdminActionState,
} from "@/lib/admin";
import { resendLoggedEmail } from "@/lib/email";
import { requireAdmin } from "@/lib/supabase";

export async function resendEmail(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const id = formData.get("emailId");
  if (!isUuid(id)) {
    return actionFailed("Email not found.");
  }
  return runAction(async () => {
    const row = await getEmailLogRow(id);
    if (!row) {
      return actionFailed("Email not found.");
    }
    if (row.status !== "failed") {
      return actionFailed("Only failed emails can be resent.");
    }
    if (!needsResend(row, await emailSiblings(row))) {
      revalidatePath("/admin/email-log");
      return actionHandled("Already resent. A later copy of this email went out, so nothing was sent again.");
    }
    const booking = row.booking_id ? await getBooking(row.booking_id) : null;
    if (!emailRelevant(row.kind, booking)) {
      return actionFailed("No longer relevant. This booking has changed since the email was written, so it was not sent.");
    }
    const result = await resendLoggedEmail(id);
    revalidatePath("/admin/email-log");
    return result.ok
      ? { ok: true, message: "Email resent." }
      : { ok: false, message: `Resend failed: ${result.error ?? "unknown error"}` };
  });
}
