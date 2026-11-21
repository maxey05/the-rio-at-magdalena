import Image from "next/image";
import Link from "next/link";
import { FacebookIcon, InstagramIcon, MailIcon, MapPinIcon, MessageIcon, PhoneIcon } from "@/components/icons";
import { footerContent, privacyLink, site } from "@/lib/content";
import { manilaNow } from "@/lib/rules";

const footLinkStyles =
  "relative inline-flex min-h-11 min-w-0 items-center [overflow-wrap:anywhere] text-cream transition-colors duration-400 after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-out hover:text-oatmeal hover:after:scale-x-100 focus-visible:outline-cream focus-visible:after:scale-x-100";

const socialStyles = "inline-flex size-11 items-center justify-center text-cream focus-visible:outline-cream";

export function SiteFooter() {
  const { year } = manilaNow();

  return (
    <footer className="bg-earth text-cream">
      {process.env.SITE_ENV !== "production" && (
        <p className="bg-warning-soft px-4 py-2 text-center text-small font-bold text-warning-strong">
          Draft preview — not the live site
        </p>
      )}
      <div className="mx-auto grid max-w-320 grid-cols-[minmax(0,1fr)] gap-14 px-5 pt-24 pb-20 md:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] md:px-10">
        <div className="flex flex-col gap-5">
          <Image src="/brand/logo-cream.svg" alt={site.name} width={120} height={120} unoptimized className="size-30" />
          <p className="font-brand-display text-[1.75rem] leading-tight">{footerContent.contactTitle}</p>
          <ul className="flex flex-col gap-3.5 font-brand-body text-[1.375rem]">
            {footerContent.emails.map((email) => (
              <li key={email.href} className="flex items-center gap-3.5">
                <MailIcon width={20} height={20} strokeWidth={1.3} className="shrink-0" />
                <a href={email.href} className={footLinkStyles}>
                  {email.label}
                </a>
              </li>
            ))}
            <li className="flex items-center gap-3.5">
              <PhoneIcon width={20} height={20} strokeWidth={1.3} className="shrink-0" />
              <a href={footerContent.phone.href} className={footLinkStyles}>
                {footerContent.phone.label}
              </a>
            </li>
            <li className="flex items-start gap-3.5 text-[1.1875rem] leading-snug">
              <MapPinIcon width={20} height={20} strokeWidth={1.3} className="mt-0.75 shrink-0" />
              <span>{footerContent.address}</span>
            </li>
          </ul>
          <div className="flex gap-1.5 pt-1.5">
            <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram (opens in a new tab)" className={socialStyles}>
              <InstagramIcon width={22} height={22} strokeWidth={1.4} />
            </a>
            <a href={site.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook (opens in a new tab)" className={socialStyles}>
              <FacebookIcon width={22} height={22} strokeWidth={1.4} />
            </a>
            <a href={site.messengerUrl} target="_blank" rel="noopener noreferrer" aria-label="Messenger (opens in a new tab)" className={socialStyles}>
              <MessageIcon width={22} height={22} strokeWidth={1.4} />
            </a>
          </div>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-5">
          <p className="font-brand-display text-[2.5rem] leading-none">{footerContent.exploreTitle}</p>
          <ul className="flex flex-col gap-1 font-brand-body text-[1.375rem]">
            {footerContent.exploreLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={footLinkStyles}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-cream/28">
        <div className="mx-auto flex max-w-320 flex-wrap items-center justify-between gap-3 px-5 py-2 font-brand-label text-small tracking-[0.08em] md:px-10">
          <p>
            © {year} {site.name}
          </p>
          <Link href={privacyLink.href} className={footLinkStyles}>
            {privacyLink.label}
          </Link>
        </div>
      </div>
    </footer>
  );
}
