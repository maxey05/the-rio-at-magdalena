"use client";

import { useEffect } from "react";

export function RevealObserver() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      return;
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
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    root.classList.add("reveal-ready");
    return () => {
      observer.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}
