import type { ComponentType, SVGProps } from "react";
import { Button } from "@/components/button";
import { CalendarCheckIcon, ClockIcon, PawIcon, TentIcon } from "@/components/icons";
import { TextLink } from "@/components/text-link";
import { homeFaq, site, type HomeFaqIcon } from "@/lib/content";
import { revealDelay } from "@/lib/reveal";

const icons: Record<HomeFaqIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  "calendar-check": CalendarCheckIcon,
  clock: ClockIcon,
  paw: PawIcon,
  tent: TentIcon,
};

const cardDelays = [150, 270, 390, 510, 650];

const cardStyles = "flex flex-col gap-3 bg-cream-light px-6 py-7 shadow-card-earth";

export function HomeFaq() {
  const { ask } = homeFaq;

  return (
    <section id="faq" data-reveal-group="" aria-labelledby="home-faq-title" className="bg-oatmeal px-5 py-[clamp(4.5rem,8vw,7rem)] md:px-10">
      <div className="mx-auto max-w-340">
        <div className="mb-[clamp(2rem,4vw,3rem)] flex flex-col gap-4">
          <p
            data-reveal=""
            data-anim="rise"
            className="font-brand-label text-overline font-semibold uppercase tracking-label text-sienna-strong"
          >
            {homeFaq.overline}
          </p>
          <h2
            id="home-faq-title"
            data-reveal=""
            data-anim="rise"
            style={revealDelay(120)}
            className="font-brand-display text-[clamp(2.25rem,3.6vw,3.25rem)] leading-[1.05] font-normal text-earth"
          >
            {homeFaq.title}
          </h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 min-[1100px]:grid-cols-5">
          {homeFaq.items.map((item, index) => {
            const Icon = icons[item.icon];
            return (
              <li
                key={item.question}
                data-reveal=""
                data-anim="rise"
                style={revealDelay(cardDelays[index])}
                className={cardStyles}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-11 items-center justify-center rounded-full border border-earth/30 text-olive-strong"
                >
                  <Icon width={20} height={20} strokeWidth={1.5} />
                </span>
                <h3 className="font-brand-body text-[1.375rem] leading-[1.25] font-semibold text-earth">{item.question}</h3>
                <p className="font-brand-body text-[1.125rem] leading-[1.55] text-earth">{item.answer}</p>
              </li>
            );
          })}
          <li
            data-reveal=""
            data-anim="rise"
            style={revealDelay(cardDelays[4])}
            className={`${cardStyles} sm:col-span-2 min-[1100px]:col-span-1`}
          >
            <p className="font-brand-display text-[1.75rem] leading-[1.15] text-earth">{ask.title}</p>
            <p className="font-brand-body text-[1.125rem] leading-[1.55] text-earth">{ask.body}</p>
            <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 pt-2">
              <Button href={site.messengerUrl} variant="olive" size="small" arrow target="_blank" rel="noopener noreferrer">
                {ask.action}
                <span className="sr-only">(opens in a new tab)</span>
              </Button>
              <TextLink href={ask.allLink.href}>{ask.allLink.label}</TextLink>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
