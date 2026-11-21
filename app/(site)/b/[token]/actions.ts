"use server";

import { revalidatePath } from "next/cache";
import { findByToken } from "@/lib/bookings";
import { cancelBooking, type CancelState } from "@/lib/cancellations";
import { sendAdminNewProof, sendProofReceived } from "@/lib/email";
import {
  checkContractBytes,
  checkProofBytes,
  checkUploadTotal,
  expireStaleHolds,
  holdIsOpen,
  markPaymentReview,
  removeContract,
  removeProof,
  uploadContract,
  uploadProof,
  type ProofState,
} from "@/lib/proofs";
import { isGuestCancellable, manilaToday, statusLabel, type FieldErrors } from "@/lib/rules";
import type { Booking } from "@/lib/supabase";

function fail(errors: FieldErrors, message: string | null = null): ProofState {
  return { errors, message };
}

async function showCurrentStatus(token: string, booking: Booking): Promise<ProofState> {
  const wasStaleHold = booking.status === "awaiting_payment";
  if (wasStaleHold) {
    await expireStaleHolds();
  }
  revalidatePath(`/b/${token}`);
  const message = wasStaleHold
    ? "Your hold expired, so the slots were released. You can book again."
    : `This booking is now ${statusLabel(booking.status).toLowerCase()}.`;
  return fail({}, message);
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
  const booking = await findByToken(token);
  if (!booking) {
    return fail({}, "We could not find this booking.");
  }
  if (!holdIsOpen(booking)) {
    return showCurrentStatus(token, booking);
  }

  const errors: FieldErrors = {};
  const proofBytes = await readBytes(formData.get("proof"));
  const contractBytes = await readBytes(formData.get("contract"));
  const proofCheck = checkProofBytes(proofBytes);
  const contractCheck = checkContractBytes(contractBytes);
  if (!proofCheck.ok) {
    errors.proof = proofCheck.error;
  }
  if (!contractCheck.ok) {
    errors.contract = contractCheck.error;
  }
  const totalError = checkUploadTotal(proofBytes.length, contractBytes.length);
  if (totalError && proofCheck.ok && contractCheck.ok) {
    errors.contract = totalError;
  }
  if (!proofCheck.ok || !contractCheck.ok || totalError) {
    return fail(errors);
  }

  const proofPath = await uploadProof(booking.id, proofBytes, proofCheck.image);
  if (proofPath === null) {
    return fail({}, "We could not upload your screenshot. Please try again.");
  }
  const contractPath = await uploadContract(booking.id, contractBytes, contractCheck.file);
  if (contractPath === null) {
    await removeProof(proofPath);
    return fail({}, "We could not upload your signed contract. Please try again.");
  }

  const result = await markPaymentReview(booking.id, proofPath, contractPath);
  if (result.kind !== "submitted") {
    await Promise.all([removeProof(proofPath), removeContract(contractPath)]);
  }
  if (result.kind === "error") {
    return fail({}, "Something went wrong saving your payment proof. Please try again.");
  }
  if (result.kind === "stale") {
    const current = (await findByToken(token)) ?? booking;
    return showCurrentStatus(token, current);
  }

  revalidatePath(`/b/${token}`);
  await sendProofEmails(result.booking);
  return fail({});
}

const CANNOT_CANCEL = "This booking can no longer be cancelled online. Please message us.";
const CANCEL_HANDLED = "This booking was already changed, so nothing was cancelled.";
const CANCEL_FAILED = "Something went wrong cancelling your booking. Please try again or message us.";

export async function cancelByToken(token: string): Promise<CancelState> {
  const booking = await findByToken(token);
  if (!booking) {
    return { message: "We could not find this booking." };
  }
  const allowed =
    isGuestCancellable({ status: booking.status, checkIn: booking.check_in }, manilaToday()) &&
    (booking.status !== "awaiting_payment" || holdIsOpen(booking));
  if (!allowed) {
    revalidatePath(`/b/${token}`);
    return { message: CANNOT_CANCEL };
  }

  const result = await cancelBooking(booking.id, "guest", null);
  revalidatePath(`/b/${token}`);
  if (result.kind === "error") {
    return { message: CANCEL_FAILED };
  }
  return { message: result.kind === "handled" ? CANCEL_HANDLED : null };
}
