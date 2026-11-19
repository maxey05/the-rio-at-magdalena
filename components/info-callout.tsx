import type { ReactNode } from "react";
import { InfoIcon } from "@/components/icons";

type InfoCalloutProps = {
  title?: string;
  icon?: ReactNode;
  children?: ReactNode;
};

export function InfoCallout({ title, icon, children }: InfoCalloutProps) {
  return (
    <div role="note" className="flex gap-3 rounded-card border-l-4 border-ember bg-ember-soft p-5 text-ink">
      <span className="mt-0.5 shrink-0 text-ember-strong">{icon ?? <InfoIcon />}</span>
      <div className="flex flex-col gap-2">
        {title ? <p className="font-bold">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}
