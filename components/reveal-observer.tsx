"use client";

import { useEffect } from "react";

export function RevealObserver() {
  useEffect(() => {
    // On a refresh, start at the top of the page instead of where the browser left off.
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const previousRestoration = window.history.scrollRestoration;
    if (navigation?.type === "reload" && !window.location.hash) {
      window.history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      return () => {
        window.history.scrollRestoration = previousRestoration;
      };
    }
    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-revealed", "");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );
    // Sections marked data-reveal-group show all their elements together as soon as the section enters view.
    const groupObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll("[data-reveal]").forEach((element) => element.setAttribute("data-revealed", ""));
            groupObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -15% 0px" },
    );
    document.querySelectorAll("[data-reveal-group]").forEach((group) => groupObserver.observe(group));
    document.querySelectorAll("[data-reveal]").forEach((element) => {
      if (!element.closest("[data-reveal-group]")) {
        observer.observe(element);
      }
    });
    root.classList.add("reveal-ready");
    return () => {
      observer.disconnect();
      groupObserver.disconnect();
      window.history.scrollRestoration = previousRestoration;
      root.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}
