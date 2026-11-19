import Image from "next/image";
import { Button } from "@/components/button";
import { homeHero } from "@/lib/content";

export function HomeHero() {
  const { photo } = homeHero;
  const hasPhoto = photo.src !== null;

  return (
    <section
      aria-labelledby="home-hero-title"
      className={`relative isolate overflow-hidden text-bg ${hasPhoto ? "bg-forest" : "bg-linear-to-b from-forest via-forest to-moss-strong"}`}
    >
      {photo.src ? (
        <>
          <Image src={photo.src} alt={photo.alt} fill priority sizes="100vw" className="-z-10 object-cover" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-forest via-forest/50 to-forest/40" />
        </>
      ) : null}
      <div className="mx-auto flex min-h-136 max-w-page flex-col justify-end gap-6 px-4 pt-32 pb-16 md:min-h-176 md:px-8 md:pb-24">
        <p className="text-overline font-bold uppercase tracking-overline text-moss-tint">{homeHero.overline}</p>
        <h1 id="home-hero-title" className="max-w-3xl text-display md:text-display-lg">
          {homeHero.headline}
        </h1>
        <p className="max-w-reading text-h3">{homeHero.subheading}</p>
        <div className="flex flex-wrap gap-3">
          <Button href={homeHero.primaryAction.href}>{homeHero.primaryAction.label}</Button>
          <Button href={homeHero.secondaryAction.href} variant="secondary">
            {homeHero.secondaryAction.label}
          </Button>
        </div>
      </div>
    </section>
  );
}
