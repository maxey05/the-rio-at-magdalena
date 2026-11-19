"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/button";
import { MobileMenu } from "@/components/mobile-menu";
import { Wordmark } from "@/components/wordmark";
import { bookLink, navLinks, site } from "@/lib/content";

type HeaderVariant = "solid" | "overlay";

type SiteHeaderProps = {
  variant?: HeaderVariant;
};

const headerStyles: Record<HeaderVariant, string> = {
  overlay: "absolute inset-x-0 top-0 z-30 text-surface",
  solid: "relative z-30 border-b border-line bg-bg text-ink",
};

export function SiteHeader({ variant }: SiteHeaderProps) {
  const pathname = usePathname();
  const activeVariant: HeaderVariant = variant ?? (pathname === "/" ? "overlay" : "solid");

  return (
    <header className={headerStyles[activeVariant]}>
      <div className="mx-auto flex h-18 max-w-page items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/" aria-label={`${site.name}, home`} className="rounded-input">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => {
            const isCurrent = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isCurrent ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-3 text-small font-medium hover:underline hover:underline-offset-8 ${
                  isCurrent ? "underline decoration-ember decoration-2 underline-offset-8" : ""
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <Button href={bookLink.href} size="small">
            <span className="lg:hidden">Book</span>
            <span className="hidden lg:inline">{bookLink.label}</span>
          </Button>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
