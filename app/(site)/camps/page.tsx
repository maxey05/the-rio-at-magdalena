import { Button } from "@/components/button";
import { InfoCallout } from "@/components/info-callout";
import { PageHeader } from "@/components/page-header";
import { PhotoFrame } from "@/components/photo-card";
import { Section } from "@/components/section";
import { comingSoonCamps, describeSlots, noWalkInsNotice, openCamps } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Camps",
  description:
    "Camp 1 has slots A to I along the riverbank cliff and Camp 2 has slots J to O beside the river. Each slot fits up to 10 guests. Camps 3 and 4 are coming soon.",
  path: "/camps",
});

export default function CampsPage() {
  return (
    <>
      <PageHeader
        overline="The camps"
        title="Choose your camp and slot"
        intro="Every slot is booked by one group per night and fits up to 10 guests. Bigger groups book more than one slot."
      />

      {openCamps.map((camp, index) => (
        <Section key={camp.id} tone={index % 2 === 0 ? "bg" : "surface"} labelledBy={`${camp.id}-title`}>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <p className="text-overline font-bold uppercase tracking-overline text-ember-strong">
                  {describeSlots(camp)}
                </p>
                <h2 id={`${camp.id}-title`}>{camp.name}</h2>
                <p className="text-h3 font-normal">{camp.summary}</p>
              </div>
              <ul className="flex flex-col gap-2">
                {camp.layout.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="flex flex-col gap-3">
                <h3>Slots</h3>
                <ul aria-label={`${camp.name} slots`} className="flex flex-wrap gap-2">
                  {camp.slots.map((slot) => (
                    <li
                      key={slot}
                      className="rounded-chip border border-line bg-surface px-4 py-2 text-small font-bold"
                    >
                      Slot {slot}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <h3>What&apos;s nearby</h3>
                <ul className="flex list-disc flex-col gap-2 pl-5">
                  {camp.nearby.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
            {camp.aerial ? (
              <PhotoFrame
                photo={camp.aerial}
                fit="natural"
                sizes="(min-width: 1024px) 560px, 100vw"
                className="border border-line"
              />
            ) : null}
          </div>
        </Section>
      ))}

      <Section tone="surface" labelledBy="camps-soon-title">
        <div className="flex flex-col gap-6 rounded-card border border-dashed border-line bg-bg p-6 text-ink-muted md:p-8">
          <div className="flex flex-col gap-2">
            <h2 id="camps-soon-title">Coming soon</h2>
            <p>
              {comingSoonCamps.map((camp) => camp.name).join(" and ")} are not open yet. They cannot be booked for now.
            </p>
          </div>
        </div>
      </Section>

      <Section labelledBy="camps-book-title">
        <div className="flex flex-col items-start gap-6">
          <h2 id="camps-book-title">Ready to pick a slot?</h2>
          <InfoCallout title={noWalkInsNotice.title}>
            <p>{noWalkInsNotice.body}</p>
          </InfoCallout>
          <div className="flex flex-wrap gap-3">
            <Button href="/book">Book a stay</Button>
            <Button href="/rates" variant="secondary">
              See rates
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
