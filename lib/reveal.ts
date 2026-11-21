import type { CSSProperties } from "react";

export function revealDelay(milliseconds: number): CSSProperties {
  return { "--d": `${milliseconds}ms` } as CSSProperties;
}
