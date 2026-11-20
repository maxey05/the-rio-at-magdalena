"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/button";
import { CheckIcon, InfoIcon } from "@/components/icons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyButton } from "@/components/copy-button";
import { InfoCallout } from "@/components/info-callout";
import { ProofViewer } from "@/components/proof-viewer";
import type { AdminActionState } from "@/lib/admin";
import { formatPeso } from "@/lib/rules";
import { confirmPayment, rejectPayment } from "./actions";

export type PaymentCardData = {
  id: string;
  ref: string;
  guestName: string;
  mobile: string;
  email: string;
  stay: string;
  slots: string;
  guests: string;
  tents: number;
  downpayment: number;
  total: number;
  gcashRef: string | null;
  proofUrl: string | null;
  submitted: string | null;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium sm:text-right">{children}</dd>
    </div>
  );
}

function Result({ result }: { result: AdminActionState }) {
  const Icon = result.ok ? CheckIcon : InfoIcon;
  return (
    <div role="status" className="flex flex-col gap-2 rounded-input bg-moss-soft p-4">
      <p className={`flex items-center gap-2 font-bold ${result.ok && !result.emailFailed ? "text-moss-strong" : "text-ink"}`}>
        <Icon width={20} height={20} className="shrink-0" />
        {result.message}
      </p>
      {result.emailFailed ? (
        <p>
          The decision is saved. Open the{" "}
          <Link href="/admin/email-log" className="font-bold text-moss-strong underline">
            Email log
          </Link>{" "}
          to resend it.
        </p>
      ) : null}
    </div>
  );
}

function PaymentCard({ data }: { data: PaymentCardData }) {
  const [result, setResult] = useState<AdminActionState | null>(null);
  const settled = result !== null && (result.ok || result.handled === true);
  const hidden = { bookingId: data.id };

  return (
    <article aria-labelledby={`pay-${data.id}`} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={`pay-${data.id}`} className="tabular-nums">
            {data.ref}
          </h2>
          {data.submitted ? <p className="text-small text-ink-muted">Proof sent {data.submitted} (Manila time)</p> : null}
        </div>
        <Button href={`/admin/bookings/${data.id}`} variant="secondary" size="small">
          Open booking
        </Button>
      </div>

      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <ProofViewer url={data.proofUrl} alt={`GCash screenshot for ${data.ref}`} />
        <dl className="w-full divide-y divide-line">
          <Row label="Downpayment to verify">
            <span className="text-h3 font-bold tabular-nums">{formatPeso(data.downpayment)}</span>
          </Row>
          <Row label="GCash reference">
            <span className="flex flex-wrap items-center gap-3 sm:justify-end">
              <span className="font-mono tabular-nums">{data.gcashRef ?? "None"}</span>
              {data.gcashRef ? <CopyButton text={data.gcashRef} /> : null}
            </span>
          </Row>
          <Row label="Guest">
            {data.guestName}
            <span className="block text-small font-normal text-ink-muted">
              {data.mobile} · {data.email}
            </span>
          </Row>
          <Row label="Stay">{data.stay}</Row>
          {data.slots ? <Row label="Slots">{data.slots}</Row> : null}
          <Row label="Guests">{data.guests}</Row>
          {data.tents > 0 ? <Row label="Tents">{data.tents}</Row> : null}
          <Row label="Booking total">
            <span className="tabular-nums">{formatPeso(data.total)}</span>
          </Row>
        </dl>
      </div>

      {result && settled ? <Result result={result} /> : null}

      {settled ? null : (
        <div className="flex flex-wrap gap-3">
          <ConfirmDialog
            trigger="Confirm payment"
            title="Confirm this payment?"
            description={
              <p>
                Check that {formatPeso(data.downpayment)} reached your GCash with reference{" "}
                <span className="font-mono">{data.gcashRef ?? "none"}</span>. The guest gets the confirmed email.
              </p>
            }
            confirmLabel="Confirm payment"
            pendingLabel="Confirming..."
            hidden={hidden}
            action={confirmPayment}
            onResult={setResult}
          />
          <ConfirmDialog
            trigger="Reject"
            triggerVariant="danger"
            title="Reject this payment?"
            description={<p>The slots are freed right away and the guest is emailed your reason.</p>}
            confirmLabel="Reject payment"
            pendingLabel="Rejecting..."
            danger
            reasonLabel="Reason (the guest will see this)"
            reasonHint="10 to 300 characters."
            fields={[
              {
                kind: "checkbox",
                name: "moneyReceived",
                label: "Money was received (for example, the wrong amount). Mark a refund as due.",
              },
            ]}
            hidden={hidden}
            action={rejectPayment}
            onResult={setResult}
          />
        </div>
      )}
    </article>
  );
}

export function PaymentList({ cards }: { cards: PaymentCardData[] }) {
  const [seen] = useState(cards);
  const shown = [...seen, ...cards.filter((card) => !seen.some((candidate) => candidate.id === card.id))];

  if (shown.length === 0) {
    return (
      <InfoCallout title="Nothing waiting">
        <p>New GCash payment proofs show up here as soon as a guest sends them.</p>
      </InfoCallout>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {shown.map((card) => (
        <li key={card.id}>
          <PaymentCard data={card} />
        </li>
      ))}
    </ul>
  );
}
