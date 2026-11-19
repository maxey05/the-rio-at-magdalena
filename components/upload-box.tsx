"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent } from "react";
import { CameraIcon, InfoIcon } from "@/components/icons";

type UploadBoxProps = {
  id: string;
  name: string;
  maxBytes: number;
  invalid?: boolean;
  describedBy?: string;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function UploadBox({ id, name, maxBytes, invalid = false, describedBy }: UploadBoxProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setPreviewUrl(null);
    setFileName(null);
    setLocalError(null);
    if (!file) {
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      input.value = "";
      setLocalError("Upload a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > maxBytes) {
      input.value = "";
      setLocalError(`That image is over ${Math.round(maxBytes / (1024 * 1024))} MB. Choose a smaller screenshot.`);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
  }

  const errorId = `${id}-local-error`;

  return (
    <div className="flex flex-col gap-2">
      <input
        id={id}
        name={name}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={pick}
        aria-invalid={invalid || localError !== null}
        aria-describedby={[describedBy, localError ? errorId : null].filter(Boolean).join(" ") || undefined}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-surface p-4 text-center transition-colors duration-150 ease-out hover:bg-moss-soft peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ember ${
          invalid || localError ? "border-danger" : "border-line"
        }`}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Preview of your GCash screenshot"
            width={96}
            height={96}
            unoptimized
            className="h-24 w-24 rounded-input object-cover"
          />
        ) : (
          <CameraIcon width={32} height={32} className="text-moss" />
        )}
        <span className="font-bold text-ink">{fileName ?? "Upload GCash screenshot"}</span>
        <span className="text-small text-ink-muted">
          {fileName ? "Tap to choose a different image" : "JPG, PNG or WebP, up to 5 MB"}
        </span>
      </label>
      {localError ? (
        <p id={errorId} role="alert" className="flex items-start gap-2 text-small text-danger">
          <InfoIcon width={18} height={18} className="mt-0.5 shrink-0" />
          {localError}
        </p>
      ) : null}
    </div>
  );
}
