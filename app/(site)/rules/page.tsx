import Link from "next/link";
import { Button } from "@/components/button";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";
import { RuleIconView } from "@/components/icon-map";
import { InfoCallout } from "@/components/info-callout";
import { MessengerButton } from "@/components/messenger-button";
import { PageHeader } from "@/components/page-header";
import { Section, SectionHeading } from "@/components/section";
import { cancellationSummary, faq, houseRules, noWalkInsNotice, whatToBring } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "House rules & FAQ",
  description:
    "House rules, what to bring and answers on check-in, kids, pets, payment, cancellation and weather. No walk-ins: book online at least a day ahead.",
  path: "/rules",
});

export default function RulesPage() {
  return (
    <>
      <PageHeader
        overline="Rules & FAQ"
        title="House rules and good-to-knows"
        intro="A few simple rules keep the riverside clean, calm and fun for everyone. You agree to them when you book."
      />

      <Section labelledBy="rules-list-title">
        <SectionHeading id="rules-list-title" overline="House rules" title="How we keep it nice here" />
        <div className="mb-8 max-w-reading">
          <InfoCallout title={noWalkInsNotice.title}>
            <p>{noWalkInsNotice.body}</p>
          </InfoCallout>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {houseRules.map((rule) => (
            <li key={rule.title} className="flex gap-4 rounded-card border border-line bg-surface p-5">
              <span className="mt-0.5 shrink-0 text-moss">
                <RuleIconView icon={rule.icon} />
              </span>
              <div className="flex flex-col gap-1">
                <h3>{rule.title}</h3>
                <p className="text-ink-muted">{rule.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="surface" labelledBy="rules-bring-title">
        <SectionHeading id="rules-bring-title" overline="What to bring" title="Pack list" />
        <ul className="grid gap-3 md:grid-cols-2">
          {whatToBring.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckIcon className="mt-0.5 shrink-0 text-moss" />
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="rules-cancel-title">
        <SectionHeading id="rules-cancel-title" overline="Cancellation" title="Plans change" />
        <ul className="flex max-w-reading list-disc flex-col gap-3 pl-5">
          {cancellationSummary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-6">
          <Link href="/rates" className="inline-flex min-h-11 items-center font-bold text-moss-strong underline underline-offset-4">
            See rates and payment details
          </Link>
        </p>
      </Section>

      <Section tone="surface" labelledBy="rules-faq-title">
        <SectionHeading id="rules-faq-title" overline="FAQ" title="Questions guests ask" />
        <div className="flex max-w-reading flex-col gap-3">
          {faq.map((item) => (
            <details key={item.question} className="group rounded-card border border-line bg-bg">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-5 py-3 font-bold [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDownIcon className="shrink-0 text-moss transition-transform duration-150 ease-out group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-5 text-ink-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section labelledBy="rules-cta-title">
        <div className="flex flex-col items-start gap-6">
          <h2 id="rules-cta-title">Still have a question?</h2>
          <div className="flex flex-wrap gap-3">
            <MessengerButton />
            <Button href="/book" variant="secondary">
              Book a stay
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
