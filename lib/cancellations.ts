import { sendAdminGuestCancelled, sendCancelled, sendRefundSent, type EmailResult } from "./email.ts";
import { normalizeGcashRef, type BookingStatus, type FieldErrors } from "./rules.ts";
import { db, type Booking } from "./supabase.ts";

export type CancelState = { message: string | null };

export type CancelResult =
  | { kind: "cancelled"; booking: Booking; refundDue: boolean; emailFailed: boolean }
  | { kind: "handled" }
  | { kind: "error" };

export type RefundResult =
  | { kind: "sent"; booking: Booking; emailFailed: boolean }
  | { kind: "invalid"; errors: FieldErrors }
  | { kind: "handled" }
  | { kind: "error" };

export const REFUND_REF_ERROR = "Enter the 13-digit reference number from the GCash receipt of the refund.";

export const CANCELLABLE_STATUSES: readonly BookingStatus[] = ["awaiting_payment", "payment_review", "confirmed"];
const FOLLOW_UP_ATTEMPTS = 2;

export function refundOwed(previous: BookingStatus): boolean {
  return previous === "payment_review" || previous === "confirmed";
}

async function recordCancellation(
  id: string,
  by: "guest" | "admin",
  reason: string | null,
  refundDue: boolean,
): Promise<Booking | null> {
  for (let attempt = 0; attempt < FOLLOW_UP_ATTEMPTS; attempt += 1) {
    const { data, error } = await db()
      .from("bookings")
      .update({
        cancelled_at: new Date().toISOString(),
        cancelled_by: by,
        cancel_reason: by === "admin" ? reason : null,
        refund_status: refundDue ? "due" : "none",
      })
      .eq("id", id)
      .eq("status", "cancelled")
      .select("*");
    const rows = (data ?? []) as Booking[];
    if (!error && rows.length === 1) {
      return rows[0];
    }
    console.error("cancel follow-up update failed", id, error?.message ?? `${rows.length} rows updated`);
  }
  return null;
}

function failed(results: EmailResult[], label: string, ref: string): boolean {
  let anyFailed = false;
  for (const result of results) {
    if (!result.ok) {
      anyFailed = true;
      console.error(label, ref, result.error);
    }
  }
  return anyFailed;
}

export async function cancelBooking(id: string, by: "guest" | "admin", reason: string | null): Promise<CancelResult> {
  const { data, error } = await db().rpc("release_booking", {
    p_id: id,
    p_expected: CANCELLABLE_STATUSES,
    p_new_status: "cancelled",
  });
  if (error) {
    console.error("release_booking failed", id, error.message);
    return { kind: "error" };
  }
  if (data === null || data === undefined) {
    return { kind: "handled" };
  }

  const previous = data as BookingStatus;
  const refundDue = refundOwed(previous);
  const booking = await recordCancellation(id, by, reason, refundDue);
  if (booking === null) {
    console.error(
      `CANCELLED BUT NOT RECORDED: booking ${id} was released (previous status ${previous}) but cancelled_at, cancelled_by and refund_status were not saved. Fix it by hand in Supabase.`,
    );
    return { kind: "error" };
  }

  const sends = [sendCancelled(booking)];
  if (by === "guest" && refundDue) {
    sends.push(sendAdminGuestCancelled(booking));
  }
  const emailFailed = failed(await Promise.all(sends), "cancel email failed", booking.ref);
  return { kind: "cancelled", booking, refundDue, emailFailed };
}

export async function recordRefund(id: string, rawRef: string): Promise<RefundResult> {
  const ref = normalizeGcashRef(rawRef);
  if (ref === null) {
    return { kind: "invalid", errors: { ref: REFUND_REF_ERROR } };
  }
  const { data, error } = await db()
    .from("bookings")
    .update({ refund_status: "sent", refund_ref: ref, refunded_at: new Date().toISOString() })
    .eq("id", id)
    .eq("refund_status", "due")
    .select("*");
  if (error) {
    console.error("record refund failed", id, error.message);
    return { kind: "error" };
  }
  const rows = (data ?? []) as Booking[];
  if (rows.length !== 1) {
    return { kind: "handled" };
  }
  const emailFailed = failed([await sendRefundSent(rows[0])], "refund email failed", rows[0].ref);
  return { kind: "sent", booking: rows[0], emailFailed };
}
