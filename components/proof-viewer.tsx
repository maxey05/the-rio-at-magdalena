"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/button";
import { CameraIcon, InfoIcon } from "@/components/icons";

type ProofViewerProps = {
  url: string | null;
  alt: string;
};

export function ProofViewer({ url, alt }: ProofViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [failed, setFailed] = useState(false);

  if (url === null || failed) {
    return (
      <p className="flex items-start gap-2 text-small text-ink-muted">
        <InfoIcon width={18} height={18} className="mt-0.5 shrink-0" />
        <span>
          {url === null
            ? "No screenshot is available for this booking."
            : "The screenshot link has expired or could not load. Reload this page for a fresh link."}
        </span>
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className="relative block h-40 w-28 overflow-hidden rounded-input border border-line bg-bg"
      >
        <Image
          src={url}
          alt={alt}
          width={112}
          height={160}
          unoptimized
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-ink/70 py-1 text-small font-bold text-surface">
          <CameraIcon width={16} height={16} />
          View
        </span>
      </button>
      <dialog
        ref={dialogRef}
        aria-label="Payment screenshot"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            event.currentTarget.close();
          }
        }}
        className="m-auto max-h-dvh w-[calc(100%-2rem)] max-w-xl rounded-card border border-line bg-surface p-0 text-ink backdrop:bg-ink/60"
      >
        <div className="flex flex-col gap-4 p-4">
          <Image
            src={url}
            alt={alt}
            width={800}
            height={1200}
            unoptimized
            onError={() => setFailed(true)}
            className="mx-auto h-auto max-h-[75dvh] w-auto max-w-full rounded-input object-contain"
          />
          <div className="flex justify-end">
            <Button variant="secondary" size="small" onClick={() => dialogRef.current?.close()}>
              Close
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
