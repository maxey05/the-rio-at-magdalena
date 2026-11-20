import type { Metadata } from "next";
import { formatManilaDateTime, guestBreakdown, listPaymentReview, staySummary } from "@/lib/admin";
import { bookingSlotLabels } from "@/lib/bookings";
import { signedProofUrl } from "@/lib/proofs";
import { requireAdmin, type Booking } from "@/lib/supabase";
import { PaymentList, type PaymentCardData } from "./payment-card";

export const metadata: Metadata = { title: "Payments to verify" };

async function toCard(booking: Booking): Promise<PaymentCardData> {
  const [proofUrl, slots] = await Promise.all([
    booking.proof_path ? signedProofUrl(booking.proof_path) : Promise.resolve(null),
    bookingSlotLabels(booking),
  ]);
  return {
    id: booking.id,
    ref: booking.ref,
    guestName: booking.guest_name,
    mobile: booking.mobile,
    email: booking.email,
    stay: staySummary(booking),
    slots: slots.join(", "),
    guests: `${booking.guests}: ${guestBreakdown(booking)}`,
    tents: booking.tents,
    downpayment: booking.downpayment,
    total: booking.total,
    gcashRef: booking.gcash_ref,
    proofUrl,
    submitted: booking.proof_submitted_at ? formatManilaDateTime(booking.proof_submitted_at) : null,
  };
}

export default async function PaymentsPage() {
  await requireAdmin();
  const cards = await Promise.all((await listPaymentReview()).map(toCard));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1>Payments to verify</h1>
        <p className="text-ink-muted">Oldest first. Screenshot links stay valid for 10 minutes; reload for a fresh link. Decided cards stay on screen until you reload.</p>
      </div>
      <PaymentList cards={cards} />
    </div>
  );
}
