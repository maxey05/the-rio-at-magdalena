"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";

type CopyStatus = "idle" | "copied" | "failed";

type CopyButtonProps = {
  text: string;
  label?: string;
};

const RESET_DELAY_MS = 2000;

export function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function copy() {
    let next: CopyStatus = "copied";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      next = "failed";
    }
    setStatus(next);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setStatus("idle"), RESET_DELAY_MS);
  }

  const visibleText = status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : label;

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-moss bg-surface px-5 text-small font-bold text-moss-strong transition-colors duration-150 ease-out hover:bg-moss-soft"
      >
        {status === "copied" ? <CheckIcon width={18} height={18} /> : <CopyIcon width={18} height={18} />}
        {visibleText}
        <span className="sr-only"> {text}</span>
      </button>
      <span role="status" className="sr-only">
        {status === "copied" ? `Copied ${text}` : status === "failed" ? "Copy failed. Select the text and copy it manually." : ""}
      </span>
    </>
  );
}
