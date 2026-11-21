import { Button } from "@/components/button";
import { CheckIcon, LockIcon, TentIcon } from "@/components/icons";
import { InfoCallout } from "@/components/info-callout";
import { MessengerButton } from "@/components/messenger-button";
import { PageHeader } from "@/components/page-header";
import { RateCard } from "@/components/rate-card";
import { Section, SectionHeading } from "@/components/section";
import {
  cancellationSummary,
  noWalkInsNotice,
  onSiteFees,
  paymentSummary,
  rateCards,
  ratesExample,
  ratesGuestNotes,
  ratesIncluded,
  tentRental,
} from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";
import { DEFAULT_SETTINGS, formatPeso } from "@/lib/rules";

export const metadata = pageMetadata({
  title: "Rates",
  description:
    "Overnight ₱500 per person, day tour ₱300, tents ₱500 per night. Seniors and kids 4 to 12 pay less. No walk-ins: book online at least a day ahead.",
  path: "/rates",
});

export default function RatesPage() {
  return (
    <>
      <PageHeader
        overline="Rates"
        title="Simple rates, same every day"
        intro="No weekend or holiday surcharge. Pay 50% by GCash when you book and the rest a day before you arrive."
      />

      <Section labelledBy="rates-tables-title">
        <SectionHeading id="rates-tables-title" title="Per person" />
        <div className="grid gap-6 md:grid-cols-2">
          {rateCards.map((rate) => (
            <RateCard key={rate.id} rate={rate} />
          ))}
        </div>
        <ul className="mt-8 flex max-w-reading flex-col gap-3">
          {ratesGuestNotes.map((note) => (
            <li key={note} className="flex items-start gap-3 text-ink-muted">
              <CheckIcon className="mt-0.5 shrink-0 text-moss" />
              {note}
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="surface" labelledBy="rates-tents-title">
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-4">
            <TentIcon width={32} height={32} className="text-moss" />
            <h2 id="rates-tents-title">Tent rental</h2>
            <p className="text-h3 font-bold tabular-nums">
              {tentRental.price} <span className="text-body font-normal text-ink-muted">{tentRental.unit}</span>
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {tentRental.notes.map((note) => (
              <li key={note} className="flex items-start gap-3">
                <CheckIcon className="mt-0.5 shrink-0 text-moss" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section labelledBy="rates-example-title">
        <SectionHeading
          id="rates-example-title"
          overline="Worked example"
          title="How a booking adds up"
          intro="Overnight price is per person, per night, multiplied by the number of nights."
        />
        <div className="flex max-w-reading flex-col gap-4 rounded-card border border-line bg-surface p-6 md:p-8">
          <p className="font-bold">
            {ratesExample.adults} adults + 1 child aged {ratesExample.childAge}, {ratesExample.nights} nights
          </p>
          <p className="text-h3 font-bold tabular-nums">{ratesExample.formula}</p>
          <dl className="flex flex-col">
            <div className="flex items-baseline justify-between gap-4 border-t border-line py-3">
              <dt>Downpayment ({DEFAULT_SETTINGS.downpaymentPct}%, rounded up)</dt>
              <dd className="font-bold tabular-nums">{formatPeso(ratesExample.downpayment)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line py-3">
              <dt>Balance (due a day before arrival)</dt>
              <dd className="font-bold tabular-nums">{formatPeso(ratesExample.balance)}</dd>
            </div>
          </dl>
        </div>
      </Section>

      <Section tone="surface" labelledBy="rates-included-title">
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-4">
            <h2 id="rates-included-title">What&apos;s included</h2>
            <ul className="flex flex-col gap-3">
              {ratesIncluded.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 shrink-0 text-moss" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <InfoCallout title={onSiteFees.title} icon={<LockIcon />}>
            <ul className="flex list-disc flex-col gap-2 pl-5">
              {onSiteFees.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </InfoCallout>
        </div>
      </Section>

      <Section labelledBy="rates-payment-title">
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-4">
            <h2 id="rates-payment-title">How payment works</h2>
            <ol className="flex list-decimal flex-col gap-3 pl-5">
              {paymentSummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-4">
            <h2>Cancellation</h2>
            <ul className="flex list-disc flex-col gap-3 pl-5">
              {cancellationSummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="surface" labelledBy="rates-cta-title">
        <div className="flex flex-col items-start gap-6">
          <h2 id="rates-cta-title">Ready to book?</h2>
          <InfoCallout title={noWalkInsNotice.title}>
            <p>{noWalkInsNotice.body}</p>
          </InfoCallout>
          <div className="flex flex-wrap gap-3">
            <Button href="/book">Book a stay</Button>
            <MessengerButton variant="secondary" />
          </div>
        </div>
      </Section>
    </>
  );
}
