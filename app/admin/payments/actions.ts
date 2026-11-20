"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailed,
  actionHandled,
  isUuid,
  releaseBooking,
  runAction,
  transition,
  type AdminActionState,
} from "@/lib/admin";
import { sendConfirmed, sendRejected } from "@/lib/email";
import { validateReason } from "@/lib/rules";
import { requireAdmin } from "@/lib/supabase";

const NOT_FOUND = "Booking not found.";

function refresh(): void {
  revalidatePath("/admin/payments");
}

export async function confirmPayment(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const id = formData.get("bookingId");
  if (!isUuid(id)) {
    return actionFailed(NOT_FOUND);
  }
  return runAction(async () => {
    const booking = await transition(id, "payment_review", "confirmed", {
      decided_at: new Date().toISOString(),
      decided_by: admin.email,
    });
    refresh();
    if (!booking) {
      return actionHandled();
    }
    const email = await sendConfirmed(booking);
    return {
      ok: true,
      message: email.ok ? "Confirmed · email sent" : "Confirmed · the email could not be sent",
      emailFailed: !email.ok,
    };
  });
}

export async function rejectPayment(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const id = formData.get("bookingId");
  if (!isUuid(id)) {
    return actionFailed(NOT_FOUND);
  }
  const reason = validateReason(String(formData.get("reason") ?? ""));
  if (!reason.ok) {
    return actionFailed(null, { reason: reason.error });
  }
  const moneyReceived = formData.get("moneyReceived") === "on";
  return runAction(async () => {
    const previous = await releaseBooking(id, ["payment_review"], "rejected");
    refresh();
    if (previous === null) {
      return actionHandled();
    }
    const booking = await transition(id, "rejected", "rejected", {
      reject_reason: reason.value,
      decided_at: new Date().toISOString(),
      decided_by: admin.email,
      ...(moneyReceived ? { refund_status: "due" as const } : {}),
    });
    if (!booking) {
      throw new Error(`rejected booking ${id} could not be updated with its reason`);
    }
    const email = await sendRejected(booking);
    const refund = moneyReceived ? " · refund marked due" : "";
    return {
      ok: true,
      message: `${email.ok ? "Rejected · email sent" : "Rejected · the email could not be sent"}${refund}`,
      emailFailed: !email.ok,
    };
  });
}
