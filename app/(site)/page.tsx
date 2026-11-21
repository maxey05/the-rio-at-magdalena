import { HomeCamps } from "@/components/home-camps";
import { HomeCta } from "@/components/home-cta";
import { HomeFaq } from "@/components/home-faq";
import { HomeGallery } from "@/components/home-gallery";
import { HomeHero } from "@/components/home-hero";
import { HomeIntro } from "@/components/home-intro";
import { HomeLocation } from "@/components/home-location";
import { HomeReviews } from "@/components/home-reviews";
import { HomeSocial } from "@/components/home-social";
import { RevealObserver } from "@/components/reveal-observer";
import { site } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: site.name,
  absoluteTitle: "The Rio At Magdalena | Riverside camping in Magdalena, Laguna",
  description:
    "Camp between two rivers in Magdalena, Laguna. Overnight camping, day tours and intimate events. No walk-ins: book online at least a day ahead.",
  path: "/",
});

export default function HomePage() {
  return (
    <div className="font-brand-body text-earth">
      <HomeHero />
      <HomeIntro />
      <HomeCamps />
      <HomeGallery />
      <HomeReviews />
      <HomeFaq />
      <HomeLocation />
      <HomeSocial />
      <HomeCta />
      <RevealObserver />
    </div>
  );
}
