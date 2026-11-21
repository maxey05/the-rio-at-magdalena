"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { MobileMenu } from "@/components/mobile-menu";
import { bookLink, navLinks, site } from "@/lib/content";

type HeaderVariant = "solid" | "overlay";

type SiteHeaderProps = {
  variant?: HeaderVariant;
};

const HEADER_HEIGHT = 89;

const navLinkStyles =
  "relative inline-flex min-h-11 items-center text-cream transition-colors duration-400 after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-out hover:text-oatmeal hover:after:scale-x-100 focus-visible:outline-cream focus-visible:after:scale-x-100";

export function SiteHeader({ variant }: SiteHeaderProps) {
  const pathname = usePathname();
  const activeVariant: HeaderVariant = variant ?? (pathname === "/" ? "overlay" : "solid");
  const isOverlay = activeVariant === "overlay";
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    if (!isOverlay) {
      return;
    }
    function update() {
      const hero = document.getElementById("home-hero");
      const limit = hero ? hero.offsetHeight - HEADER_HEIGHT : 0;
      setPastHero(window.scrollY > limit);
    }
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isOverlay]);

  const background = isOverlay && !pastHero ? "bg-shade/42" : "bg-earth/97";

  return (
    <header
      className={`sticky top-0 z-50 border-b border-cream/12 text-cream transition-colors duration-400 ${background} ${isOverlay ? "rio-fade-in" : ""}`}
    >
      <div className="mx-auto flex h-22 max-w-340 items-center justify-between gap-4 px-5 md:px-10">
        <Link
          href="/"
          aria-label={`${site.name}, home`}
          className="inline-flex min-h-11 items-center focus-visible:outline-cream"
        >
          <Image src="/brand/logo-cream.svg" alt="" width={64} height={64} unoptimized priority className="size-16" />
        </Link>
        <nav
          aria-label="Main"
          className="hidden items-center gap-9 font-brand-label text-button font-semibold uppercase tracking-nav lg:flex"
        >
          {navLinks.map((link) => {
            const isCurrent = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isCurrent ? "page" : undefined}
                className={`${navLinkStyles} ${isCurrent ? "after:scale-x-100" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <Button href={bookLink.href} variant="cream" size="small" arrow>
            {bookLink.label}
          </Button>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
