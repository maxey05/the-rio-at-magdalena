import Link from "next/link";
import { FacebookIcon, InstagramIcon, MapPinIcon } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";
import { privacyLink, site } from "@/lib/content";
import { manilaNow } from "@/lib/rules";

const externalLinkStyles = "inline-flex min-h-11 items-center gap-2 underline underline-offset-4";

export function SiteFooter() {
  const { year } = manilaNow();

  return (
    <footer className="bg-forest text-bg">
      <div className="mx-auto grid max-w-page gap-12 px-4 py-16 md:grid-cols-3 md:px-8">
        <div className="flex flex-col gap-4">
          <Wordmark />
          <p className="max-w-xs text-small">{site.description}</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-overline font-bold uppercase tracking-overline text-moss-tint">Find us</p>
          <p className="flex items-start gap-2">
            <MapPinIcon className="mt-1 shrink-0" />
            <span>{site.address}</span>
          </p>
          <a href={site.mapUrl} target="_blank" rel="noopener noreferrer" className={externalLinkStyles}>
            Open in Google Maps
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-overline font-bold uppercase tracking-overline text-moss-tint">Follow along</p>
          <a href={site.facebookUrl} target="_blank" rel="noopener noreferrer" className={externalLinkStyles}>
            <FacebookIcon />
            Facebook
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer" className={externalLinkStyles}>
            <InstagramIcon />
            Instagram
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
      <div className="border-t border-moss">
        <div className="mx-auto flex max-w-page flex-col gap-2 px-4 py-6 text-small md:flex-row md:items-center md:justify-between md:px-8">
          <p>{site.quietHours}</p>
          <Link href={privacyLink.href} className="inline-flex min-h-11 items-center underline underline-offset-4">
            {privacyLink.label}
          </Link>
          <p>
            © {year} {site.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
