"use client";

type StepperProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string;
};

const buttonStyles =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-moss bg-surface text-h3 font-bold text-moss-strong transition-colors duration-150 ease-out hover:bg-moss-soft disabled:cursor-not-allowed disabled:opacity-50";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function Stepper({ id, label, value, min, max, onChange, hint }: StepperProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const upper = Math.max(min, max);

  return (
    <div role="group" aria-labelledby={`${id}-label`} className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span id={`${id}-label`} className="font-medium">
          {label}
        </span>
        {hint ? (
          <span id={hintId} className="text-small text-ink-muted">
            {hint}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Fewer ${label}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - 1, min, upper))}
          className={buttonStyles}
        >
          <span aria-hidden="true">−</span>
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-labelledby={`${id}-label`}
          aria-describedby={hintId}
          value={value}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "");
            onChange(clamp(digits === "" ? min : Number(digits), min, upper));
          }}
          className="min-h-11 w-14 rounded-input border border-line bg-surface text-center text-body font-bold tabular-nums focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss"
        />
        <button
          type="button"
          aria-label={`More ${label}`}
          disabled={value >= upper}
          onClick={() => onChange(clamp(value + 1, min, upper))}
          className={buttonStyles}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  );
}
