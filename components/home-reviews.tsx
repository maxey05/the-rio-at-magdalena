import Image from "next/image";
import { Button } from "@/components/button";
import { StarIcon } from "@/components/icons";
import { googleReviews, type GoogleReview } from "@/lib/content";
import { revealDelay } from "@/lib/reveal";

const starIndexes = [0, 1, 2, 3, 4];
const writtenDelays = [700, 850];
const ratingDelays = [1050, 1200];

type StarsProps = {
  rating?: number;
  size?: number;
  animated?: boolean;
};

function Stars({ rating = 5, size = 20, animated = false }: StarsProps) {
  const animation = animated ? { "data-reveal": "", "data-anim": "stars" } : {};

  return (
    <div role="img" aria-label={`Rated ${rating} out of 5`} className="flex gap-0.75 text-sienna" {...animation}>
      {starIndexes.map((index) => (
        <span key={index} className={index < rating ? "" : "opacity-25"}>
          <StarIcon width={size} height={size} style={animated ? revealDelay(350 + index * 90) : undefined} />
        </span>
      ))}
    </div>
  );
}

function Reviewer({ review }: { review: GoogleReview }) {
  return (
    <div className="flex items-center gap-3.5">
      <Image src={review.avatar} alt="" width={48} height={48} className="size-12 shrink-0 rounded-full" />
      <div className="flex flex-col gap-1">
        <p className="font-brand-body text-[1.25rem] leading-tight font-semibold text-earth">{review.name}</p>
        <div className="flex items-center gap-2.5">
          <Stars rating={review.rating} size={16} />
          <p className="font-brand-body text-[1.0625rem] leading-tight text-earth-muted">{review.when}</p>
        </div>
      </div>
    </div>
  );
}

export function HomeReviews() {
  return (
    <section id="reviews" data-reveal-group="" aria-labelledby="home-reviews-title" className="bg-chartreuse px-5 py-[clamp(5.5rem,10vw,8.75rem)] md:px-10">
      <div className="mx-auto flex max-w-320 flex-col gap-14">
        <div className="flex flex-col items-center gap-4 text-center">
          <p
            data-reveal=""
            data-anim="rise"
            className="font-brand-label text-overline font-semibold uppercase tracking-label text-earth"
          >
            {googleReviews.overline}
          </p>
          <h2
            id="home-reviews-title"
            data-reveal=""
            data-anim="rise"
            style={revealDelay(120)}
            className="font-brand-display text-[clamp(2.25rem,3.6vw,3.25rem)] leading-[1.05] font-normal text-earth"
          >
            {googleReviews.title}
          </h2>
          <Stars animated />
        </div>
        <div className="flex flex-col gap-6">
          <ul className="grid gap-6 md:grid-cols-2">
            {googleReviews.written.map((review, index) => (
              <li
                key={review.name}
                data-reveal=""
                data-anim="tilt"
                style={revealDelay(writtenDelays[index] ?? 0)}
                className="flex flex-col gap-5.5 bg-cream-light px-9 pt-8 pb-9"
              >
                <Reviewer review={review} />
                <div aria-hidden="true" className="h-px bg-oatmeal" />
                <p className="font-brand-display text-[1.75rem] leading-[1.3] text-earth">“{review.quote}”</p>
              </li>
            ))}
          </ul>
          <ul className="grid gap-6 md:grid-cols-2">
            {googleReviews.ratingsOnly.map((review, index) => (
              <li
                key={review.name}
                data-reveal=""
                data-anim="rise"
                style={revealDelay(ratingDelays[index] ?? 0)}
                className="bg-cream-light px-7 py-6"
              >
                <Reviewer review={review} />
              </li>
            ))}
          </ul>
        </div>
        <div data-reveal="" data-anim="rise" style={revealDelay(700)} className="flex flex-wrap justify-center gap-3.5">
          <Button href={googleReviews.readMore.href} variant="olive" arrow>
            {googleReviews.readMore.label}
          </Button>
          <Button href={googleReviews.write.href} variant="ghost-earth">
            {googleReviews.write.label}
          </Button>
        </div>
      </div>
    </section>
  );
}
