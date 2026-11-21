"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useSyncExternalStore } from "react";

const SHOW_DELAY_MS = 120;
const ROUTE_TIMEOUT_MS = 8000;

let activeCount = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getCount() {
  return activeCount;
}

function getServerCount() {
  return 0;
}

function begin() {
  activeCount += 1;
  emit();
}

function end() {
  activeCount = Math.max(0, activeCount - 1);
  emit();
}

type TopLoadingBarProps = {
  active: boolean;
};

export function TopLoadingBar({ active }: TopLoadingBarProps) {
  useEffect(() => {
    if (!active) {
      return;
    }
    begin();
    return end;
  }, [active]);

  return null;
}

function RouteTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const routing = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!routing.current) {
      return;
    }
    routing.current = false;
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
    end();
  }, [pathname, search]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) {
        return;
      }
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      if (routing.current) {
        return;
      }
      routing.current = true;
      begin();
      timer.current = window.setTimeout(() => {
        if (routing.current) {
          routing.current = false;
          end();
        }
      }, ROUTE_TIMEOUT_MS);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}

function Bar() {
  const busy = useSyncExternalStore(subscribe, getCount, getServerCount) > 0;
  const barRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const shown = useRef(false);

  useEffect(() => {
    const bar = barRef.current;
    const fill = fillRef.current;
    if (!bar || !fill) {
      return;
    }
    if (busy) {
      if (shown.current) {
        return;
      }
      const timeout = window.setTimeout(() => {
        shown.current = true;
        bar.setAttribute("aria-hidden", "false");
        fill.dataset.state = "reset";
        void fill.offsetWidth;
        fill.dataset.state = "running";
      }, SHOW_DELAY_MS);
      return () => window.clearTimeout(timeout);
    }
    if (shown.current) {
      shown.current = false;
      bar.setAttribute("aria-hidden", "true");
      fill.dataset.state = "done";
    }
  }, [busy]);

  return (
    <div ref={barRef} role="progressbar" aria-label="Loading" aria-hidden="true" className="top-loading-bar">
      <div ref={fillRef} className="top-loading-fill" />
    </div>
  );
}

export function GlobalLoadingBar() {
  return (
    <>
      <Bar />
      <Suspense fallback={null}>
        <RouteTracker />
      </Suspense>
    </>
  );
}
