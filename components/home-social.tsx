import type { CSSProperties } from "react";
import Image from "next/image";
import { FacebookIcon, InstagramIcon } from "@/components/icons";
import { homeSocial, site } from "@/lib/content";
import { revealDelay } from "@/lib/reveal";

const socialLinks = [
  { href: site.instagramUrl, label: "Instagram (opens in a new tab)", Icon: InstagramIcon, delay: 350 },
  { href: site.facebookUrl, label: "Facebook (opens in a new tab)", Icon: FacebookIcon, delay: 450 },
];

export function HomeSocial() {
  return (
    <section
      id="follow"
      aria-labelledby="home-social-title"
      className="bg-earth px-5 py-[clamp(3.5rem,6vw,5.5rem)] text-cream md:px-10"
    >
      <div className="mx-auto grid max-w-340 items-center gap-8 md:grid-cols-[minmax(200px,1fr)_minmax(0,4fr)] md:gap-[clamp(2rem,4vw,3.5rem)]">
        <div className="flex flex-col gap-4.5">
          <p
            data-reveal=""
            data-anim="rise"
            className="font-brand-label text-overline font-semibold uppercase tracking-label text-oatmeal"
          >
            {homeSocial.overline}
          </p>
          <h2
            id="home-social-title"
            data-reveal=""
            data-anim="rise"
            style={revealDelay(120)}
            className="font-brand-display text-[clamp(2.25rem,3.6vw,3.25rem)] leading-[1.05] font-normal text-cream"
          >
            {homeSocial.title}
          </h2>
          <ul className="flex gap-2.5 pt-1">
            {socialLinks.map(({ href, label, Icon, delay }) => (
              <li key={href} data-reveal="" data-anim="pop" style={revealDelay(delay)}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex size-11 items-center justify-center rounded-full border border-cream/55 text-cream transition-[transform,background-color] duration-300 ease-out hover:scale-108 hover:bg-cream/16 focus-visible:outline-cream"
                >
                  <Icon width={18} height={18} strokeWidth={1.4} />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {homeSocial.tiles.map((tile, index) => (
            <li key={tile.id} data-reveal="" data-anim="deal" style={revealDelay(250 + index * 130)}>
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${tile.label} (opens in a new tab)`}
                style={{ "--r": tile.tilt } as CSSProperties}
                className="polaroid group/tile focus-visible:outline-cream"
              >
                <span className="polaroid-img block aspect-4/5 bg-earth-deep">
                  <Image
                    src={tile.src}
                    alt=""
                    fill
                    sizes="(min-width: 1360px) 260px, (min-width: 768px) 20vw, 45vw"
                    style={{ objectPosition: tile.position }}
                    className="object-cover"
                  />
                  <span className="film" aria-hidden="true" />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-shade/55 text-cream opacity-0 transition-opacity duration-400 ease-out group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100"
                  >
                    <InstagramIcon width={26} height={26} strokeWidth={1.4} />
                    <span className="font-brand-label text-overline font-semibold uppercase tracking-button">
                      View on Instagram
                    </span>
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
