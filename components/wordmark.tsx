import { site } from "@/lib/content";

export function Wordmark() {
  return (
    <span className="flex flex-col leading-none">
      <span className="font-display text-h2 font-semibold">{site.shortName}</span>
      <span className="mt-1 text-overline font-bold uppercase tracking-overline opacity-80">{site.tagline}</span>
    </span>
  );
}
