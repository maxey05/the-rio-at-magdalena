import { Button } from "@/components/button";
import { MapPinIcon } from "@/components/icons";
import { MapEmbed } from "@/components/map-embed";
import { homeLocation, site } from "@/lib/content";
import { revealDelay } from "@/lib/reveal";

export function HomeLocation() {
  return (
    <section id="location" aria-labelledby="home-location-title" className="bg-cream px-5 py-[clamp(5.5rem,10vw,8.75rem)] md:px-10">
      <div className="mx-auto grid max-w-320 items-center gap-10 md:grid-cols-2 md:gap-[clamp(2.5rem,6vw,6rem)]">
        <div
          data-reveal=""
          data-anim="offset"
          style={revealDelay(250)}
          className="relative border border-earth/30 bg-cream-light p-3"
        >
          <div className="overflow-hidden border border-earth/15">
            <MapEmbed className="h-80 md:h-110" />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <p
            data-reveal=""
            data-anim="rise"
            className="font-brand-label text-overline font-semibold uppercase tracking-label text-sienna-strong"
          >
            {homeLocation.overline}
          </p>
          <h2
            id="home-location-title"
            data-reveal=""
            data-anim="rise"
            style={revealDelay(150)}
            className="font-brand-display text-[clamp(2.25rem,3.6vw,3.25rem)] leading-[1.05] font-normal text-earth"
          >
            {homeLocation.title}
          </h2>
          <div className="relative pt-6">
            <span
              aria-hidden="true"
              data-reveal=""
              data-anim="line"
              style={revealDelay(400)}
              className="absolute inset-x-0 top-0 h-px bg-earth/30"
            />
            <p
              data-reveal=""
              data-anim="rise"
              style={revealDelay(600)}
              className="flex items-center gap-3 font-brand-body text-[1.3125rem] font-semibold text-earth"
            >
              <MapPinIcon width={18} height={18} strokeWidth={1.5} className="shrink-0 text-olive-strong" />
              {site.address}
            </p>
          </div>
          <div data-reveal="" data-anim="rise" style={revealDelay(750)} className="flex flex-wrap gap-3.5 pt-2">
            <Button href={site.mapUrl} variant="olive" arrow target="_blank" rel="noopener noreferrer">
              Get directions
              <span className="sr-only">(opens in a new tab)</span>
            </Button>
            <Button href="/getting-there" variant="ghost-olive">
              Getting there
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
