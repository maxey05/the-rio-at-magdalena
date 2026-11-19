import { Button } from "@/components/button";
import type { RateCardData } from "@/lib/content";

type RateCardProps = {
  rate: RateCardData;
  showAction?: boolean;
};

export function RateCard({ rate, showAction = true }: RateCardProps) {
  const headingId = `rate-${rate.id}`;

  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-6 rounded-card border border-line bg-surface p-6 md:p-8">
      <header className="flex flex-col gap-1">
        <p className="text-overline font-bold uppercase tracking-overline text-ember-strong">{rate.overline}</p>
        <h3 id={headingId} className="text-h2 font-display font-semibold">
          {rate.timeRange}
        </h3>
        <p className="text-ink-muted">{rate.unit}</p>
      </header>
      <dl className="flex flex-col">
        {rate.rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 border-t border-line py-3">
            <dt>{row.label}</dt>
            <dd className="text-h3 font-bold tabular-nums">{row.price}</dd>
          </div>
        ))}
      </dl>
      {showAction ? (
        <Button href={rate.cta.href} variant="secondary" className="mt-auto w-full">
          {rate.cta.label}
        </Button>
      ) : null}
    </article>
  );
}
