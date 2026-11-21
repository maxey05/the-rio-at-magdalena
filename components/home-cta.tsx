import Image from "next/image";
import { Button } from "@/components/button";
import { closingCta, site } from "@/lib/content";

export function HomeCta() {
  return (
    <section id="book" aria-labelledby="home-cta-title" className="bg-olive px-5 py-[clamp(6rem,11vw,10rem)] text-cream md:px-10">
      <div className="mx-auto flex max-w-240 flex-col items-center gap-7 text-center">
        <Image src="/brand/logo-cream.svg" alt="" width={96} height={96} unoptimized data-reveal="" className="size-24 opacity-85" />
        <h2
          id="home-cta-title"
          data-reveal="1"
          className="font-brand-display text-[clamp(3rem,6.4vw,5.75rem)] leading-none font-normal"
        >
          {closingCta.headline}
        </h2>
        <p data-reveal="2" className="max-w-128 font-brand-body text-[1.5rem] leading-[1.55] text-cream">{closingCta.body}</p>
        <div data-reveal="3" className="flex flex-wrap justify-center gap-3.5 pt-2">
          <Button href="/book" variant="cream" arrow>
            Book a stay
          </Button>
          <Button href={site.messengerUrl} variant="earth" target="_blank" rel="noopener noreferrer">
            Message us
            <span className="sr-only">(opens in a new tab)</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
