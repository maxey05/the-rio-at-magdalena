"use client";

import { useEffect, useRef } from "react";

type TopLoadingBarProps = {
  active: boolean;
};

export function TopLoadingBar({ active }: TopLoadingBarProps) {
  const fillRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) {
      return;
    }
    if (active) {
      started.current = true;
      fill.dataset.state = "reset";
      void fill.offsetWidth;
      fill.dataset.state = "running";
      return;
    }
    if (started.current) {
      fill.dataset.state = "done";
    }
  }, [active]);

  return (
    <div role="progressbar" aria-label="Loading" aria-hidden={!active} className="top-loading-bar">
      <div ref={fillRef} className="top-loading-fill" />
    </div>
  );
}
