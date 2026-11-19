import type { ReactNode } from "react";

type SectionTone = "bg" | "surface" | "forest";

type SectionProps = {
  tone?: SectionTone;
  id?: string;
  labelledBy?: string;
  className?: string;
  children: ReactNode;
};

const toneStyles: Record<SectionTone, string> = {
  bg: "bg-bg text-ink",
  surface: "bg-surface text-ink",
  forest: "bg-forest text-bg",
};

export function Section({ tone = "bg", id, labelledBy, className, children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`${toneStyles[tone]} py-16 md:py-24`}>
      <div className={`mx-auto max-w-page px-4 md:px-8 ${className ?? ""}`}>{children}</div>
    </section>
  );
}

type SectionHeadingProps = {
  id?: string;
  overline?: string;
  title: string;
  intro?: string;
  onDark?: boolean;
};

export function SectionHeading({ id, overline, title, intro, onDark = false }: SectionHeadingProps) {
  return (
    <div className="mb-8 flex max-w-reading flex-col gap-3 md:mb-12">
      {overline ? (
        <p
          className={`text-overline font-bold uppercase tracking-overline ${onDark ? "text-moss-tint" : "text-ember-strong"}`}
        >
          {overline}
        </p>
      ) : null}
      <h2 id={id}>{title}</h2>
      {intro ? <p className={onDark ? "text-bg" : "text-ink-muted"}>{intro}</p> : null}
    </div>
  );
}
