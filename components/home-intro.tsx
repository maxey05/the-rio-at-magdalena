import Image from "next/image";
import { HomePhoto } from "@/components/home-photo";
import { TextLink } from "@/components/text-link";
import { homeIntro, type HomeIntroBlock } from "@/lib/content";

type IntroTextProps = {
  block: HomeIntroBlock;
  headingId?: string;
  showLogo?: boolean;
};

function IntroText({ block, headingId, showLogo = false }: IntroTextProps) {
  return (
    <div className="flex flex-col items-center gap-7 text-center">
      {showLogo ? (
        <Image
          src="/brand/logo-earth.svg"
          alt=""
          width={72}
          height={72}
          unoptimized
          data-reveal=""
          className="size-18 opacity-90"
        />
      ) : null}
      {block.overline ? (
        <p
          data-reveal="1"
          className="font-brand-label text-overline font-semibold uppercase tracking-label text-sienna-strong"
        >
          {block.overline}
        </p>
      ) : null}
      {block.title ? (
        <h2
          id={headingId}
          data-reveal="1"
          className="font-brand-display text-[clamp(2.5rem,4.2vw,3.75rem)] leading-[1.05] font-normal text-earth"
        >
          {block.title}
        </h2>
      ) : null}
      {block.paragraphs.map((paragraph) => (
        <p key={paragraph} data-reveal="2" className="max-w-120 font-brand-body text-lead text-earth">
          {paragraph}
        </p>
      ))}
      <div data-reveal="3">
        <TextLink href={block.link.href}>{block.link.label}</TextLink>
      </div>
    </div>
  );
}

export function HomeIntro() {
  const { first, second } = homeIntro;

  return (
    <section aria-labelledby="home-intro-title" className="bg-cream px-5 py-[clamp(5.5rem,11vw,10rem)] md:px-10">
      <div className="mx-auto flex max-w-300 flex-col gap-[clamp(4rem,9vw,8rem)]">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-[clamp(2.5rem,7vw,7rem)]">
          <div data-reveal="">
            <HomePhoto photo={first.photo} sizes="(min-width: 768px) 560px, 100vw" className="aspect-4/5" />
          </div>
          <IntroText block={first} headingId="home-intro-title" showLogo />
        </div>
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-[clamp(2.5rem,7vw,7rem)]">
          <div data-reveal="1" className="md:order-last">
            <HomePhoto photo={second.photo} sizes="(min-width: 768px) 560px, 100vw" className="aspect-4/5" />
          </div>
          <IntroText block={second} />
        </div>
      </div>
    </section>
  );
}
