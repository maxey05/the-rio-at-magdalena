 com"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/button";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { bookLink, navLinks, site } from "@/lib/content";

export function MobileMenu() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    function closeOnBackdropClick(event: MouseEvent) {
      if (event.target === dialog) {
        dialog?.close();
      }
    }
    dialog.addEventListener("click", closeOnBackdropClick);
    return () => dialog.removeEventListener("click", closeOnBackdropClick);
  }, []);

  function openMenu() {
    dialogRef.current?.showModal();
  }

  function closeMenu() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={openMenu}
        aria-label="Open menu"
        aria-haspopup="dialog"
        className="inline-flex size-11 items-center justify-center rounded-xs border border-cream/60 text-cream focus-visible:outline-cream lg:hidden"
      >
        <MenuIcon />
      </button>
      <dialog
        ref={dialogRef}
        aria-label="Site menu"
        className="m-0 ml-auto h-dvh max-h-none w-80 max-w-[85vw] bg-cream p-0 text-earth backdrop:bg-earth/60"
      >
        <div className="flex h-full flex-col gap-8 overflow-y-auto p-4">
          <div className="flex items-center justify-between">
            <Image src="/brand/logo-olive-strong.svg" alt={site.name} width={56} height={56} unoptimized className="size-14" />
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="inline-flex size-11 items-center justify-center rounded-xs"
            >
              <CloseIcon />
            </button>
          </div>
          <nav aria-label="Mobile">
            <ul className="flex flex-col">
              {navLinks.map((link) => (
                <li key={link.href} className="border-b border-oatmeal">
                  <Link href={link.href} onClick={closeMenu} className="flex min-h-14 items-center font-brand-label text-small font-semibold uppercase tracking-nav">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Button href={bookLink.href} variant="olive" arrow onClick={closeMenu} className="mt-auto w-full">
            {bookLink.label}
          </Button>
        </div>
      </dialog>
    </>
  );
}
