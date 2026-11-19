"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/icons";
import { PhotoFrame } from "@/components/photo-card";
import type { Photo } from "@/lib/content";

type GalleryGridProps = {
  photos: readonly Photo[];
};

const thumbnailSizes = "(min-width: 768px) 33vw, 50vw";

const navButtonStyles =
  "inline-flex size-12 items-center justify-center rounded-full bg-surface text-moss-strong transition-colors duration-150 ease-out hover:bg-moss-soft";

export function GalleryGrid({ photos }: GalleryGridProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const viewable = photos.filter((photo) => photo.src !== null);
  const currentIndex = viewable.findIndex((photo) => photo.id === currentId);
  const current = currentIndex >= 0 ? viewable[currentIndex] : null;

  function openPhoto(event: MouseEvent<HTMLButtonElement>, id: string) {
    openerRef.current = event.currentTarget;
    setCurrentId(id);
    dialogRef.current?.showModal();
  }

  function handleClose() {
    setCurrentId(null);
    openerRef.current?.focus();
    openerRef.current = null;
  }

  function step(direction: 1 | -1) {
    if (viewable.length < 2 || currentIndex < 0) {
      return;
    }
    const nextIndex = (currentIndex + direction + viewable.length) % viewable.length;
    setCurrentId(viewable[nextIndex].id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "ArrowLeft") {
      step(-1);
    }
    if (event.key === "ArrowRight") {
      step(1);
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      dialogRef.current?.close();
    }
  }

  return (
    <>
      <ul className="columns-2 gap-4 md:columns-3">
        {photos.map((photo) => (
          <li key={photo.id} className="mb-4 break-inside-avoid">
            <figure className="flex flex-col gap-2">
              {photo.src ? (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={(event) => openPhoto(event, photo.id)}
                  className="block w-full overflow-hidden rounded-card transition-opacity duration-150 ease-out hover:opacity-90"
                >
                  <PhotoFrame photo={photo} sizes={thumbnailSizes} fit="natural" />
                </button>
              ) : (
                <PhotoFrame photo={photo} sizes={thumbnailSizes} fit="natural" />
              )}
              <figcaption className="text-small text-ink-muted">{photo.caption}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialogRef}
        aria-label="Photo viewer"
        onClose={handleClose}
        onKeyDown={handleKeyDown}
        onClick={handleBackdropClick}
        className="m-auto max-h-dvh w-full max-w-5xl bg-transparent p-0 text-bg backdrop:bg-forest/90"
      >
        {current && current.src ? (
          <div className="flex flex-col gap-4 p-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Close photo viewer"
                autoFocus
                className={navButtonStyles}
              >
                <CloseIcon />
              </button>
            </div>
            <Image
              key={current.id}
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              sizes="(min-width: 1024px) 960px, 100vw"
              className="mx-auto h-auto max-h-[70dvh] w-auto max-w-full rounded-card object-contain"
            />
            <div className="flex items-center justify-between gap-4">
              {viewable.length > 1 ? (
                <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className={navButtonStyles}>
                  <ChevronLeftIcon />
                </button>
              ) : (
                <span />
              )}
              <p className="text-center text-small" aria-live="polite">
                {current.caption} ({currentIndex + 1} of {viewable.length})
              </p>
              {viewable.length > 1 ? (
                <button type="button" onClick={() => step(1)} aria-label="Next photo" className={navButtonStyles}>
                  <ChevronRightIcon />
                </button>
              ) : (
                <span />
              )}
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
