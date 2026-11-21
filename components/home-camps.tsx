import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { HomePhoto } from "@/components/home-photo";
import { homeCamps, openCamps } from "@/lib/content";

const cardPositions = ["center 78%", "center 70%"];

export function HomeCamps() {
  return (
    <section id="camps" aria-labelledby="home-camps-title" className="bg-oatmeal px-5 py-[clamp(5.5rem,10vw,8.75rem)] md:px-10">
      <div className="mx-auto flex max-w-320 flex-col gap-14">
        <h2
          id="home-camps-title"
          data-reveal=""
          className="text-center font-brand-label text-overline font-semibold uppercase tracking-label text-sienna-strong"
        >
          {homeCamps.overline}
        </h2>
        <ul className="grid gap-10 md:grid-cols-2">
          {openCamps.map((camp, index) =>
            camp.cardPhoto ? (
              <li key={camp.id} data-reveal={String(index + 1)}>
                <Link href="/camps" className="group/card flex flex-col gap-5 text-earth">
                  <HomePhoto
                    photo={camp.cardPhoto}
                    position={cardPositions[index]}
                    sizes="(min-width: 768px) 600px, 100vw"
                    className="aspect-5/4"
                  />
                  <span className="flex items-baseline justify-between gap-4 border-t border-earth/35 pt-4">
                    <span className="font-brand-display text-[2.5rem] leading-none">{camp.name}</span>
                    <span className="inline-flex items-center gap-2.5 font-brand-label text-button font-semibold uppercase tracking-button text-olive-strong">
                      {homeCamps.action}
                      <ArrowRightIcon
                        width={14}
                        height={14}
                        strokeWidth={1.6}
                        className="transition-transform duration-300 ease-out group-hover/card:translate-x-1"
                      />
                    </span>
                  </span>
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      </div>
    </section>
  );
}
