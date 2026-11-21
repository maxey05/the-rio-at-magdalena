import Image from "next/image";
import { Button } from "@/components/button";
import { homeHero } from "@/lib/content";

export function HomeHero() {
  const { photo } = homeHero;

  return (
    <section
      id="home-hero"
      aria-labelledby="home-hero-title"
      className="relative -mt-22.25 flex min-h-svh items-end overflow-hidden bg-earth text-cream"
    >
      {photo.src ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          priority
          sizes="100vw"
          className="rio-settle object-cover object-[center_40%]"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-shade/30 via-shade/5 to-shade/60"
      />
      <div className="relative mx-auto flex w-full max-w-340 flex-col gap-7 px-5 pt-50 pb-20 md:px-10 md:pb-26">
        <div className="flex flex-col gap-3.5">
          <h1
            id="home-hero-title"
            data-delay="1"
            className="rio-rise max-w-225 font-brand-display text-[clamp(3.25rem,7.4vw,6.75rem)] leading-[0.98] font-normal tracking-[-0.01em]"
          >
            {homeHero.headline}
          </h1>
          <p data-delay="2" className="rio-rise max-w-136 font-brand-body text-[1.375rem] leading-normal">{homeHero.subheading}</p>
        </div>
        <div data-delay="3" className="rio-rise flex flex-wrap gap-3.5 pt-1">
          <Button href={homeHero.primaryAction.href} variant="cream" arrow>
            {homeHero.primaryAction.label}
          </Button>
          <Button href={homeHero.secondaryAction.href} variant="ghost-light">
            {homeHero.secondaryAction.label}
          </Button>
        </div>
      </div>
    </section>
  );
}
