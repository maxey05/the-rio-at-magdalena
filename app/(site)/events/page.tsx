import { CheckIcon } from "@/components/icons";
import { InfoCallout } from "@/components/info-callout";
import { MessengerButton } from "@/components/messenger-button";
import { PageHeader } from "@/components/page-header";
import { PhotoFrame } from "@/components/photo-card";
import { Section } from "@/components/section";
import { eventsContent } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Events & prenup shoots",
  description:
    "Plan an intimate event or a prenup shoot at The Rio At Magdalena, a riverside campsite in Laguna. Message us on Facebook to ask about dates and details.",
  path: "/events",
});

export default function EventsPage() {
  return (
    <>
      <PageHeader overline="Events" title="Intimate events and prenup shoots" intro={eventsContent.intro} />

      <Section labelledBy="events-details-title">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
          <PhotoFrame photo={eventsContent.photo} sizes="(min-width: 1024px) 560px, 100vw" />
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h2 id="events-details-title">What we host</h2>
              <ul className="flex flex-col gap-4">
                {eventsContent.eventTypes.map((type) => (
                  <li key={type.title} className="flex flex-col gap-1">
                    <h3>{type.title}</h3>
                    <p className="text-ink-muted">{type.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-4">
              <h2>How it works</h2>
              <ul className="flex flex-col gap-3">
                {eventsContent.howItWorks.map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 shrink-0 text-moss" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="surface" labelledBy="events-inquiry-title">
        <div className="flex flex-col items-start gap-6">
          <h2 id="events-inquiry-title">Send an inquiry</h2>
          <InfoCallout>
            <p>{eventsContent.formNotice}</p>
          </InfoCallout>
          <MessengerButton />
        </div>
      </Section>
    </>
  );
}
