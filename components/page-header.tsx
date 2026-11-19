import type { ReactNode } from "react";

type PageHeaderProps = {
  overline: string;
  title: string;
  intro?: string;
  children?: ReactNode;
};

export function PageHeader({ overline, title, intro, children }: PageHeaderProps) {
  return (
    <div className="border-b border-line bg-moss-soft">
      <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-12 md:px-8 md:py-16">
        <p className="text-overline font-bold uppercase tracking-overline text-ember-strong">{overline}</p>
        <h1 className="max-w-3xl">{title}</h1>
        {intro ? <p className="max-w-reading text-h3 font-normal text-ink-muted">{intro}</p> : null}
        {children}
      </div>
    </div>
  );
}
