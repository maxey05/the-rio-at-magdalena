import { Button } from "@/components/button";
import { homeHero } from "@/lib/content";

export default function HomePage() {
  return (
    <section className="bg-linear-to-b from-forest via-forest to-moss-strong text-bg">
      <div className="mx-auto flex min-h-136 max-w-page flex-col justify-end gap-6 px-4 pt-32 pb-16 md:min-h-176 md:px-8 md:pb-24">
        <p className="text-overline font-bold uppercase tracking-overline text-moss-tint">{homeHero.overline}</p>
        <h1 className="max-w-3xl text-display md:text-display-lg">{homeHero.headline}</h1>
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
