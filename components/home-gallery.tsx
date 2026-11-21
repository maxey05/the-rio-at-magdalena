import { Button } from "@/components/button";
import { HomePhoto } from "@/components/home-photo";
import { homeGallery } from "@/lib/content";
import { revealDelay } from "@/lib/reveal";

const tileDelays = [0, 220, 110, 330, 440, 260, 520];

export function HomeGallery() {
  return (
    <section id="gallery" aria-labelledby="home-gallery-title" className="bg-cream px-5 py-[clamp(5.5rem,10vw,8.75rem)] md:px-10">
      <div className="mx-auto flex max-w-320 flex-col gap-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-4">
            <p
              data-reveal=""
              data-anim="rise"
              className="font-brand-label text-overline font-semibold uppercase tracking-label text-sienna-strong"
            >
              {homeGallery.overline}
            </p>
            <h2
              id="home-gallery-title"
              data-reveal=""
              data-anim="rise"
              style={revealDelay(150)}
              className="font-brand-display text-[clamp(2.25rem,3.6vw,3.25rem)] leading-[1.05] font-normal text-earth"
            >
              {homeGallery.title}
            </h2>
          </div>
          <div data-reveal="" data-anim="rise" style={revealDelay(400)}>
            <Button href={homeGallery.action.href} variant="ghost-olive" arrow>
              {homeGallery.action.label}
            </Button>
          </div>
        </div>
        <ul className="grid auto-rows-[180px] grid-flow-dense grid-cols-2 gap-4 md:auto-rows-[240px] md:grid-flow-row md:grid-cols-4">
          {homeGallery.tiles.map((tile, index) => (
            <li
              key={tile.photo.id}
              data-reveal=""
              data-anim="pop"
              style={revealDelay(tileDelays[index] ?? 0)}
              className={tile.layout}
            >
              <HomePhoto
                photo={tile.photo}
                position={tile.position}
                tilt={tile.tilt}
                size="fill"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
