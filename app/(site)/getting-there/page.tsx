import { Button } from "@/components/button";
import { CopyButton } from "@/components/copy-button";
import { MapPinIcon } from "@/components/icons";
import { MapEmbed } from "@/components/map-embed";
import { MessengerButton } from "@/components/messenger-button";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { gettingThere, site } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Getting there",
  description:
    "Find The Rio At Magdalena at 6FF6+M8, Magdalena, Laguna. Best reached by car. See the map, copy the plus code and open directions in Google Maps.",
  path: "/getting-there",
});

export default function GettingTherePage() {
  return (
    <>
      <PageHeader overline="Getting there" title="Find The Rio" intro={gettingThere.intro} />

      <Section labelledBy="getting-there-map-title">
        <h2 id="getting-there-map-title" className="sr-only">
          Map and address
        </h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="overflow-hidden rounded-card border border-line lg:col-span-2">
            <MapEmbed className="h-96 lg:h-full lg:min-h-112" />
          </div>
          <div className="flex flex-col gap-6 rounded-card border border-line bg-surface p-6">
            <div className="flex flex-col gap-2">
              <p className="text-overline font-bold uppercase tracking-overline text-ember-strong">Address</p>
              <p className="flex items-start gap-2 font-bold">
                <MapPinIcon className="mt-0.5 shrink-0 text-moss" />
                {site.address}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-overline font-bold uppercase tracking-overline text-ember-strong">Plus code</p>
              <p className="text-h3 font-bold tabular-nums">{site.plusCode}</p>
              <div>
                <CopyButton text={site.plusCode} label="Copy plus code" />
              </div>
            </div>
            <Button href={site.mapUrl} target="_blank" rel="noopener noreferrer">
              Get directions
              <span className="sr-only">(opens in a new tab)</span>
            </Button>
          </div>
        </div>
      </Section>

      <Section tone="surface" labelledBy="getting-there-help-title">
        <div className="flex flex-col items-start gap-6">
          <h2 id="getting-there-help-title">Need help finding us?</h2>
          <p className="max-w-reading">{gettingThere.helpLine}</p>
          <MessengerButton />
        </div>
      </Section>
    </>
  );
}
