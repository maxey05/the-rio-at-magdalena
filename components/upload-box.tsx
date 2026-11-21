"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent } from "react";
import { InfoIcon, UploadIcon } from "@/components/icons";

type UploadBoxProps = {
  id: string;
  name: string;
  accept: readonly string[];
  maxBytes: number;
  title: string;
  hint: string;
  typeError: string;
  sizeError: string;
  previewAlt?: string;
  invalid?: boolean;
  describedBy?: string;
};

export function UploadBox({
  id,
  name,
  accept,
  maxBytes,
  title,
  hint,
  typeError,
  sizeError,
  previewAlt = "Preview of your upload",
  invalid = false,
  describedBy,
}: UploadBoxProps) {
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
    if (!accept.includes(file.type)) {
      input.value = "";
      setLocalError(typeError);
      return;
    }
    if (file.size > maxBytes) {
      input.value = "";
      setLocalError(sizeError);
      return;
    }
    setFileName(file.name);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  const errorId = `${id}-local-error`;

  return (
    <div className="flex flex-col gap-2">
      <input
        id={id}
        name={name}
        type="file"
        accept={accept.join(",")}
        onChange={pick}
        aria-invalid={invalid || localError !== null}
        aria-describedby={[describedBy, localError ? errorId : null].filter(Boolean).join(" ") || undefined}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xs border-2 border-dashed bg-paper p-4 text-center transition-colors duration-150 ease-out hover:bg-oatmeal peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-olive-strong ${
          invalid || localError ? "border-danger" : "border-sand-line"
        }`}
      >
        {previewUrl ? (
          <Image src={previewUrl} alt={previewAlt} width={72} height={72} unoptimized className="size-18 rounded-xs object-cover" />
        ) : (
          <UploadIcon width={28} height={28} className="text-olive-strong" />
        )}
        <span className="font-semibold text-earth">{fileName ?? title}</span>
        <span className="text-base text-earth-muted">{fileName ? "Tap to choose a different file" : hint}</span>
      </label>
      {localError ? (
        <p id={errorId} role="alert" className="flex items-start gap-2 text-base text-danger">
          <InfoIcon width={18} height={18} className="mt-0.5 shrink-0" />
          {localError}
        </p>
      ) : null}
    </div>
  );
}
