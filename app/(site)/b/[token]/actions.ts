"use server";

import { revalidatePath } from "next/cache";
import { findByToken } from "@/lib/bookings";
import { sendAdminNewProof, sendProofReceived } from "@/lib/email";
import {
  checkProofBytes,
  expireStaleHolds,
  holdIsOpen,
  markPaymentReview,
  removeProof,
  uploadProof,
  type ProofState,
} from "@/lib/proofs";
import { normalizeGcashRef, statusLabel, type FieldErrors } from "@/lib/rules";
import type { Booking } from "@/lib/supabase";

const REF_ERROR = "Enter the 13-digit reference number from your GCash receipt.";
const DUPLICATE_ERROR = "This reference number was already used.";

function fail(ref: string, errors: FieldErrors, message: string | null = null): ProofState {
  return { errors, message, ref };
}

async function showCurrentStatus(token: string, booking: Booking, ref: string): Promise<ProofState> {
  const wasStaleHold = booking.status === "awaiting_payment";
  if (wasStaleHold) {
    await expireStaleHolds();
  }
  revalidatePath(`/b/${token}`);
  const message = wasStaleHold
    ? "Your hold expired, so the slots were released. You can book again."
    : `This booking is now ${statusLabel(booking.status).toLowerCase()}.`;
  return fail(ref, {}, message);
}

async function readBytes(file: FormDataEntryValue | null): Promise<Uint8Array> {
  return file instanceof File ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array();
}

async function sendProofEmails(booking: Booking): Promise<void> {
  const results = await Promise.all([sendProofReceived(booking), sendAdminNewProof(booking)]);
  for (const result of results) {
    if (!result.ok) {
      console.error("proof email failed", booking.ref, result.error);
    }
  }
}

export async function submitProof(token: string, _previous: ProofState, formData: FormData): Promise<ProofState> {
  const rawRef = String(formData.get("ref") ?? "").slice(0, 24);
  const booking = await findByToken(token);
  if (!booking) {
    return fail(rawRef, {}, "We could not find this booking.");
  }
  if (!holdIsOpen(booking)) {
    return showCurrentStatus(token, booking, rawRef);
  }

  const errors: FieldErrors = {};
  const ref = normalizeGcashRef(rawRef);
  if (ref === null) {
    errors.ref = REF_ERROR;
  }
  const bytes = await readBytes(formData.get("proof"));
  const check = checkProofBytes(bytes);
  if (!check.ok) {
    errors.proof = check.error;
  }
  if (ref === null || !check.ok) {
    return fail(rawRef, errors);
  }

  const proofPath = await uploadProof(booking.id, bytes, check.image);
  if (proofPath === null) {
    return fail(rawRef, {}, "We could not upload your screenshot. Please try again.");
  }

  const result = await markPaymentReview(booking.id, ref, proofPath);
  if (result.kind !== "submitted") {
    await removeProof(proofPath);
  }
  if (result.kind === "duplicate") {
    return fail(rawRef, { ref: DUPLICATE_ERROR });
  }
  if (result.kind === "error") {
    return fail(rawRef, {}, "Something went wrong saving your payment proof. Please try again.");
  }
  if (result.kind === "stale") {
    const current = (await findByToken(token)) ?? booking;
    return showCurrentStatus(token, current, rawRef);
  }

  revalidatePath(`/b/${token}`);
  await sendProofEmails(result.booking);
  return fail("", {});
}
