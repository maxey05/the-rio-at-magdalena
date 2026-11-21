import { LABEL, SECTION_TITLE } from "@/components/brand-styles";

type StepTitleProps = {
  number: number;
  id?: string;
  children: string;
};

export function StepTitle({ number, id, children }: StepTitleProps) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className={`grid size-7 shrink-0 place-items-center rounded-xs bg-olive-strong text-cream ${LABEL} tracking-normal`}>
        {number}
      </span>
      <h2 id={id} className={SECTION_TITLE}>
        {children}
      </h2>
    </div>
  );
}
