"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/button";
import { ClockIcon } from "@/components/icons";

type CountdownProps = {
  expiresAt: string;
  onExpiredLabel?: string;
};

function subscribe(onChange: () => void): () => void {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
}

function readSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function readServerSeconds(): null {
  return null;
}

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function Countdown({ expiresAt, onExpiredLabel = "Hold expired" }: CountdownProps) {
  const nowSeconds = useSyncExternalStore(subscribe, readSeconds, readServerSeconds);
  const remaining = nowSeconds === null ? null : Math.max(0, Math.ceil(new Date(expiresAt).getTime() / 1000) - nowSeconds);

  if (remaining === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className="flex items-center gap-2 font-semibold text-warning-strong">
          <ClockIcon width={20} height={20} />
          {onExpiredLabel}
        </p>
        <Button href="/book" variant="ghost-earth" size="small">
          Start over
        </Button>
      </div>
    );
  }

  return (
    <p
      role="timer"
      className="inline-flex items-center gap-2 rounded-xs bg-warning-soft px-3 py-1.5 font-brand-label text-overline font-semibold uppercase tracking-button tabular-nums text-warning-strong"
    >
      <ClockIcon width={16} height={16} />
      <span>Slots held for {remaining === null ? "--:--" : formatRemaining(remaining)}</span>
    </p>
  );
}
