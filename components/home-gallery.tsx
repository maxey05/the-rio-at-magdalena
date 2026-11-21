import { Button } from "@/components/button";
import { HomePhoto } from "@/components/home-photo";
import { homeGallery } from "@/lib/content";

export function HomeGallery() {
  return (
    <section id="gallery" aria-labelledby="home-gallery-title" className="bg-cream px-5 py-[clamp(5.5rem,10vw,8.75rem)] md:px-10">
      <div className="mx-auto flex max-w-320 flex-col gap-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-4">
            <p data-reveal="" className="font-brand-label text-overline font-semibold uppercase tracking-label text-sienna-strong">
              {homeGallery.overline}
            </p>
            <h2
              id="home-gallery-title"
              data-reveal="1"
              className="font-brand-display text-[clamp(2.25rem,3.6vw,3.25rem)] leading-[1.05] font-normal text-earth"
            >
              {homeGallery.title}
            </h2>
          </div>
          <Button data-reveal="2" href={homeGallery.action.href} variant="ghost-olive" arrow>
            {homeGallery.action.label}
          </Button>
        </div>
        <ul data-reveal="" className="grid auto-rows-[180px] grid-flow-dense grid-cols-2 gap-4 md:auto-rows-[240px] md:grid-flow-row md:grid-cols-4">
          {homeGallery.tiles.map((tile) => (
            <li key={tile.photo.id} className={tile.layout}>
              <HomePhoto
                photo={tile.photo}
                position={tile.position}
                sizes="(min-width: 768px) 50vw, 100vw"
                className="size-full"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
