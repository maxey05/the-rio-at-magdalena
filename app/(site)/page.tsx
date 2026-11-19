import Link from "next/link";
import { ArrowRightIcon, CheckIcon, MapPinIcon } from "@/components/icons";
import { Button } from "@/components/button";
import { FactIconView } from "@/components/icon-map";
import { HomeHero } from "@/components/home-hero";
import { InfoCallout } from "@/components/info-callout";
import { MapEmbed } from "@/components/map-embed";
import { MessengerButton } from "@/components/messenger-button";
import { PhotoCard, PhotoFrame } from "@/components/photo-card";
import { RateCard } from "@/components/rate-card";
import { Section, SectionHeading } from "@/components/section";
import {
  bookingSteps,
  closingCta,
  describeSlots,
  facts,
  galleryStrip,
  goodToKnow,
  messengerAction,
  noWalkInsNotice,
  openCamps,
  rateCards,
  site,
} from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: site.name,
  absoluteTitle: "The Rio At Magdalena | Riverside camping in Magdalena, Laguna",
  description:
    "Camp between two rivers in Magdalena, Laguna. Overnight camping, day tours and intimate events. No walk-ins: book online at least a day ahead.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <HomeHero />

      <section aria-label="Quick facts" className="border-b border-line bg-surface">
        <ul className="mx-auto grid max-w-page grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4 md:px-8">
          {facts.map((fact) => (
            <li key={fact.label} className="flex items-center gap-3 font-bold">
              <FactIconView icon={fact.icon} className="shrink-0 text-moss" />
              {fact.label}
            </li>
          ))}
        </ul>
      </section>

      <Section labelledBy="home-visit-title">
        <SectionHeading
          id="home-visit-title"
          overline="Two ways to visit"
          title="Stay the night or spend the day"
          intro="Overnight camping and day tours, with the same simple rates every day of the year."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {rateCards.map((rate) => (
            <RateCard key={rate.id} rate={rate} />
          ))}
        </div>
        <p className="mt-6">
          <Link href="/rates" className="inline-flex min-h-11 items-center gap-2 font-bold text-moss-strong underline underline-offset-4">
            Full rates, tents and fees
            <ArrowRightIcon width={18} height={18} />
          </Link>
        </p>
      </Section>

      <Section tone="surface" labelledBy="home-camps-title">
        <SectionHeading
          id="home-camps-title"
          overline="The camps"
          title="Pick your spot by the river"
          intro="Two camps are open now. Camps 3 and 4 are coming soon."
        />
        <div className="grid gap-8 md:grid-cols-2">
          {openCamps.map((camp) =>
            camp.cardPhoto ? (
              <PhotoCard
                key={camp.id}
                photo={camp.cardPhoto}
                title={camp.name}
                description={`${describeSlots(camp)}. ${camp.summary}`}
                href="/camps"
              />
            ) : null,
          )}
        </div>
      </Section>

      <Section labelledBy="home-steps-title">
        <SectionHeading id="home-steps-title" overline="How booking works" title="Four steps to your stay" />
        <ol className="grid gap-6 md:grid-cols-4">
          {bookingSteps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6">
              <span
                aria-hidden="true"
                className="inline-flex size-10 items-center justify-center rounded-full bg-moss-strong font-bold text-surface"
              >
                {index + 1}
              </span>
              <h3>{step.title}</h3>
              <p className="text-ink-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-ink-muted">{messengerAction.comingSoonLabel}</p>
      </Section>

      <Section tone="surface" labelledBy="home-know-title">
        <SectionHeading id="home-know-title" overline="Good to know" title="A few things before you come" />
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            {goodToKnow.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckIcon className="mt-0.5 shrink-0 text-moss" />
                {item}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-4">
            <InfoCallout title={noWalkInsNotice.title}>
              <p>{noWalkInsNotice.body}</p>
            </InfoCallout>
            <Button href="/rules" variant="secondary" className="self-start">
              House rules and FAQ
            </Button>
          </div>
        </div>
      </Section>

      <Section labelledBy="home-gallery-title">
        <SectionHeading id="home-gallery-title" overline="Gallery" title="The Rio, up close" />
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {galleryStrip.map((photo) => (
            <li key={photo.id}>
              <PhotoFrame photo={photo} sizes="(min-width: 768px) 33vw, 50vw" />
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Button href="/gallery" variant="secondary">
            See all photos
          </Button>
        </div>
      </Section>

      <Section tone="surface" labelledBy="home-location-title">
        <SectionHeading id="home-location-title" overline="Location" title="Find us in Magdalena, Laguna" />
        <div className="overflow-hidden rounded-card border border-line bg-bg md:grid md:grid-cols-2">
          <MapEmbed className="h-72 md:h-full md:min-h-80" />
          <div className="flex flex-col justify-center gap-4 p-6 md:p-8">
            <p className="flex items-start gap-2 font-bold">
              <MapPinIcon className="mt-0.5 shrink-0 text-moss" />
              {site.address}
            </p>
            <p className="text-ink-muted">Best reached by car.</p>
            <div className="flex flex-wrap gap-3">
              <Button href={site.mapUrl} target="_blank" rel="noopener noreferrer">
                Get directions
                <span className="sr-only">(opens in a new tab)</span>
              </Button>
              <Button href="/getting-there" variant="secondary">
                Getting there
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="forest" labelledBy="home-cta-title">
        <div className="flex flex-col items-start gap-6">
          <h2 id="home-cta-title" className="text-display md:text-display-lg">
            {closingCta.headline}
          </h2>
          <p className="max-w-reading text-h3">{closingCta.body}</p>
          <div className="flex flex-wrap gap-3">
            <Button href="/book" variant="secondary">
              Book a stay
            </Button>
            <MessengerButton variant="secondary" />
          </div>
        </div>
      </Section>
    </>
  );
}
