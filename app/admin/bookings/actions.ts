"use server";

import { revalidatePath } from "next/cache";
import {
  actionFailed,
  actionHandled,
  ERROR_MESSAGE,
  getBooking,
  isUuid,
  releaseBooking,
  runAction,
  transition,
  type AdminActionState,
} from "@/lib/admin";
import { cancelBooking as cancelCore, recordRefund as recordRefundCore } from "@/lib/cancellations";
import { canMarkNoShow, formatPeso, manilaToday, parsePesos, validateReason } from "@/lib/rules";
import { requireAdmin } from "@/lib/supabase";

const NOT_FOUND = "Booking not found.";
const DONE: AdminActionState = { ok: true, message: null };
const CANCEL_ERROR =
  "Something went wrong. Reload the page. If this booking now shows as cancelled, check that its refund is flagged and tell Matthew; otherwise try again.";
const EMAIL_NOTICE = "An email could not be sent. Open the Email log to resend it.";

function refresh(id: string): void {
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin/bookings");
}

export async function checkIn(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const id = formData.get("bookingId");
  if (!isUuid(id)) {
    return actionFailed(NOT_FOUND);
  }
  const balanceCollected = parsePesos(String(formData.get("balanceCollected") ?? ""));
  const deposit = parsePesos(String(formData.get("deposit") ?? ""));
  if (balanceCollected === null || deposit === null) {
    return actionFailed(null, {
      ...(balanceCollected === null ? { balanceCollected: "Enter whole pesos, 0 or more." } : {}),
      ...(deposit === null ? { deposit: "Enter whole pesos, 0 or more. Use 0 if no deposit was taken." } : {}),
    });
  }
  return runAction(async () => {
    const booking = await transition(id, "confirmed", "checked_in", {
      checked_in_at: new Date().toISOString(),
      balance_collected: balanceCollected,
      deposit_amount: deposit,
    });
    refresh(id);
    return booking ? DONE : actionHandled();
  });
}

export async function markCompleted(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const id = formData.get("bookingId");
  if (!isUuid(id)) {
    return actionFailed(NOT_FOUND);
  }
  const depositReturned = formData.get("depositReturned") === "on";
  return runAction(async () => {
    const booking = await transition(id, "checked_in", "completed", { deposit_returned: depositReturned });
    refresh(id);
    return booking ? DONE : actionHandled();
  });
}

export async function markNoShow(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const id = formData.get("bookingId");
  if (!isUuid(id)) {
    return actionFailed(NOT_FOUND);
  }
  return runAction(async () => {
    const booking = await getBooking(id);
    if (!booking) {
      return actionFailed(NOT_FOUND);
    }
    if (booking.status !== "confirmed") {
      refresh(id);
      return actionHandled();
    }
    if (!canMarkNoShow(booking.check_in, manilaToday())) {
      return actionFailed("A no-show can only be marked on or after the check-in date.");
    }
    const previous = await releaseBooking(id, ["confirmed"], "no_show");
    refresh(id);
    return previous === null ? actionHandled() : DONE;
  });
}

export async function cancelBooking(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const id = formData.get("bookingId");
  if (!isUuid(id)) {
    return actionFailed(NOT_FOUND);
  }
  const reason = validateReason(String(formData.get("reason") ?? ""));
  if (!reason.ok) {
    return actionFailed(null, { reason: reason.error });
  }
  return runAction(async () => {
    const result = await cancelCore(id, "admin", reason.value);
    refresh(id);
    if (result.kind === "handled") {
      return actionHandled();
    }
    if (result.kind === "error") {
      return actionFailed(CANCEL_ERROR);
    }
    const refund = result.refundDue ? ` Refund of ${formatPeso(result.booking.downpayment)} is due.` : "";
    const notice = result.emailFailed ? ` ${EMAIL_NOTICE}` : "";
    return { ok: true, message: `Booking cancelled.${refund}${notice}`, emailFailed: result.emailFailed };
  });
}

export async function recordRefund(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const id = formData.get("bookingId");
  if (!isUuid(id)) {
    return actionFailed(NOT_FOUND);
  }
  return runAction(async () => {
    const result = await recordRefundCore(id, String(formData.get("ref") ?? "").slice(0, 40));
    if (result.kind === "invalid") {
      return actionFailed(null, result.errors);
    }
    refresh(id);
    if (result.kind === "handled") {
      return actionHandled();
    }
    if (result.kind === "error") {
      return actionFailed(ERROR_MESSAGE);
    }
    return {
      ok: true,
      message: result.emailFailed ? `Refund recorded. ${EMAIL_NOTICE}` : "Refund recorded and the guest was emailed.",
      emailFailed: result.emailFailed,
    };
  });
}
