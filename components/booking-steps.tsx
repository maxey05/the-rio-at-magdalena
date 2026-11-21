import { CheckIcon } from "@/components/icons";
import { LABEL } from "@/components/brand-styles";

const STEPS = ["Stay and slots", "Your details", "Payment"] as const;

type BookingStepsProps = {
  active: 1 | 2 | 3;
};

export function BookingSteps({ active }: BookingStepsProps) {
  return (
    <ol aria-label="Booking steps" className={`flex flex-wrap items-center gap-3 ${LABEL}`}>
      {STEPS.map((name, index) => {
        const number = index + 1;
        const done = number < active;
        const current = number === active;
        return (
          <li key={name} className="flex items-center gap-3">
            {number > 1 ? <span aria-hidden="true" className="h-px w-7 bg-sand-line" /> : null}
            <span
              aria-current={current ? "step" : undefined}
              className={`flex items-center gap-2 ${current || done ? "text-earth" : "text-earth-muted"}`}
            >
              <span
                aria-hidden="true"
                className={`grid size-6 place-items-center rounded-xs tracking-normal ${
                  current ? "bg-olive-strong text-cream" : done ? "bg-oatmeal text-earth" : "border border-sand-line"
                }`}
              >
                {done ? <CheckIcon width={12} height={12} strokeWidth={2.6} /> : number}
              </span>
              {name}
              {done ? <span className="sr-only">, done</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
