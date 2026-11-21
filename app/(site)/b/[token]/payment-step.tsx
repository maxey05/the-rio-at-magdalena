import Image from "next/image";
import { BookingSteps } from "@/components/booking-steps";
import { CARD, LABEL, PAGE_TITLE } from "@/components/brand-styles";
import { Countdown } from "@/components/countdown";
import { CopyButton } from "@/components/copy-button";
import { InfoCallout } from "@/components/info-callout";
import { MessengerButton } from "@/components/messenger-button";
import { StepTitle } from "@/components/step-title";
import { MAX_CONTRACT_BYTES, MAX_PROOF_BYTES, MAX_UPLOAD_TOTAL_BYTES, signedQrUrl } from "@/lib/proofs";
import { addDays, formatPeso } from "@/lib/rules";
import { getPaymentDetails } from "@/lib/settings";
import type { Booking } from "@/lib/supabase";
import { ProofForm } from "./proof-form";

type PaymentStepProps = {
  booking: Booking;
  slotNames: string[];
};

const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function short(date: string): string {
  return shortDay.format(new Date(`${date}T00:00:00Z`));
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function tripText(booking: Booking, slotNames: string[]): string {
  const parts =
    booking.kind === "day_tour"
      ? ["Day tour", short(booking.check_in)]
      : ["Overnight", `${short(booking.check_in)} – ${short(addDays(booking.check_in, booking.nights))}`];
  parts.push(plural(booking.guests, "camper", "campers"));
  if (slotNames.length > 0) {
    parts.push(`Slots ${slotNames.map((name) => name.replace(/^.* Slot /, "")).join(", ")}`);
  }
  return parts.join(" · ");
}

export async function PaymentStep({ booking, slotNames }: PaymentStepProps) {
  const details = await getPaymentDetails();
  const qrUrl = details.gcashQrPath ? await signedQrUrl(details.gcashQrPath) : null;
  const ready = details.gcashName !== null && details.gcashNumber !== null && qrUrl !== null;

  return (
    <div className="bg-cream font-brand-body text-[1.125rem] text-earth">
      <div className="screen-forward mx-auto flex max-w-page flex-col gap-5 px-4 pb-16 pt-8 md:px-8 md:pt-10">
        <div className="flex flex-col gap-3">
          <h1 className={PAGE_TITLE}>Payment</h1>
          <BookingSteps active={3} />
        </div>

        <div className={`${CARD} flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3`}>
          <p className="font-semibold">{tripText(booking, slotNames)}</p>
          {booking.hold_expires_at ? <Countdown expiresAt={booking.hold_expires_at} /> : null}
        </div>

        <div className="flex flex-wrap items-start gap-5">
          <section aria-labelledby="send-title" className={`${CARD} flex min-w-0 flex-[1_1_22rem] flex-col gap-4 px-5 py-4.5`}>
            <StepTitle id="send-title" number={1}>
              Send the payment
            </StepTitle>
            {ready ? (
              <>
                <div className="flex flex-col gap-1 rounded-xs bg-oatmeal px-4 py-3">
                  <p className={`${LABEL} text-earth-muted`}>Amount to send</p>
                  <p className="text-[2rem] leading-none font-semibold tabular-nums">{formatPeso(booking.downpayment)}</p>
                </div>
                <dl className="flex flex-col gap-3">
                  <div>
                    <dt className={`${LABEL} text-earth-muted`}>GCash account name</dt>
                    <dd className="font-semibold">{details.gcashName}</dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <dt className={`${LABEL} text-earth-muted`}>GCash number</dt>
                      <dd className="font-semibold tabular-nums">{details.gcashNumber}</dd>
                    </div>
                    <CopyButton text={details.gcashNumber ?? ""} variant="ghost-earth" />
                  </div>
                </dl>
                <div className="flex justify-center">
                  <Image
                    src={qrUrl}
                    alt={`GCash QR code for ${details.gcashName}`}
                    width={200}
                    height={200}
                    unoptimized
                    className="size-50 rounded-xs border border-sand-line bg-paper object-contain"
                  />
                </div>
                <ol className="flex list-decimal flex-col gap-1.5 pl-6">
                  <li>Open GCash and choose Send Money, or scan the QR code.</li>
                  <li>Send the amount above.</li>
                  <li>Save a screenshot of the receipt.</li>
                </ol>
              </>
            ) : (
              <>
                <InfoCallout>
                  <p>Payment details are being set up — please message us.</p>
                </InfoCallout>
                <div>
                  <MessengerButton />
                </div>
              </>
            )}
          </section>

          {ready ? (
            <ProofForm
              token={booking.access_token}
              proofMaxBytes={MAX_PROOF_BYTES}
              contractMaxBytes={MAX_CONTRACT_BYTES}
              totalMaxBytes={MAX_UPLOAD_TOTAL_BYTES}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
