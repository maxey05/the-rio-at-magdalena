import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { INPUT, LABEL } from "@/components/brand-styles";
import { Button } from "@/components/button";
import { FieldError } from "@/components/field";
import type { DetailsForm, FieldErrors } from "@/lib/rules";

type DetailsStepProps = {
  details: DetailsForm;
  errors: FieldErrors;
  pending: boolean;
  onChange: <K extends keyof DetailsForm>(key: K, value: DetailsForm[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const LINK = "font-semibold text-olive-strong underline underline-offset-3 hover:text-olive-deep";

type FieldProps = {
  id: string;
  label: ReactNode;
  error?: string;
  className?: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
};

function FieldShell({ id, label, error, className = "", children }: FieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className={`${LABEL} text-earth`}>
        {label}
      </label>
      {children(errorId, Boolean(error))}
      <FieldError id={errorId} error={error} />
    </div>
  );
}

type AgreeProps = {
  id: string;
  checked: boolean;
  error?: string;
  onChange: (checked: boolean) => void;
  children: ReactNode;
};

function Agree({ id, checked, error, onChange, children }: AgreeProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 text-[1.0625rem] leading-[1.45]">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-5.5 shrink-0 cursor-pointer accent-olive-strong"
        />
        <span>{children}</span>
      </label>
      <FieldError id={errorId} error={error} />
    </div>
  );
}

export function DetailsStep({ details, errors, pending, onChange, onSubmit }: DetailsStepProps) {
  const border = (invalid: boolean) => (invalid ? "border-danger" : "");
  const ready = details.agreeRules && details.agreePrivacy;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Your details"
      className="flex min-w-0 flex-[999_1_37.5rem] flex-col gap-4.5 rounded-sm border border-oatmeal bg-cream-light px-6 py-5.5"
    >
      <div className="grid gap-x-4.5 gap-y-4 sm:grid-cols-2">
        <FieldShell id="details-name" label="Full name" error={errors.name} className="sm:col-span-2">
          {(describedBy, invalid) => (
            <input
              id="details-name"
              type="text"
              autoComplete="name"
              value={details.name}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(event) => onChange("name", event.target.value)}
              className={`${INPUT} ${border(invalid)}`}
            />
          )}
        </FieldShell>
        <FieldShell id="details-email" label="Email" error={errors.email}>
          {(describedBy, invalid) => (
            <input
              id="details-email"
              type="email"
              autoComplete="email"
              value={details.email}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(event) => onChange("email", event.target.value)}
              className={`${INPUT} ${border(invalid)}`}
            />
          )}
        </FieldShell>
        <FieldShell id="details-mobile" label="Mobile number" error={errors.mobile}>
          {(describedBy, invalid) => (
            <input
              id="details-mobile"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={details.mobile}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(event) => onChange("mobile", event.target.value)}
              className={`${INPUT} ${border(invalid)}`}
            />
          )}
        </FieldShell>
        <FieldShell
          id="details-notes"
          label={
            <>
              Notes <span className="font-medium tracking-normal normal-case text-earth-muted">(optional)</span>
            </>
          }
          error={errors.notes}
          className="sm:col-span-2"
        >
          {(describedBy, invalid) => (
            <textarea
              id="details-notes"
              rows={2}
              placeholder="Anything we should know..."
              value={details.notes}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(event) => onChange("notes", event.target.value)}
              className={`${INPUT} min-h-18 resize-y ${border(invalid)}`}
            />
          )}
        </FieldShell>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-oatmeal pt-4.5">
        <Agree id="details-agreeRules" checked={details.agreeRules} error={errors.agreeRules} onChange={(value) => onChange("agreeRules", value)}>
          I agree to the{" "}
          <a href="/contract/camping-agreement.pdf" target="_blank" rel="noopener noreferrer" className={LINK}>
            camping agreement<span className="sr-only"> (opens in a new tab)</span>
          </a>
          , including the{" "}
          <Link href="/rules" target="_blank" className={LINK}>
            house rules
          </Link>
          , the liability waiver and the cancellation policy.
        </Agree>
        <Agree
          id="details-agreePrivacy"
          checked={details.agreePrivacy}
          error={errors.agreePrivacy}
          onChange={(value) => onChange("agreePrivacy", value)}
        >
          I agree to the{" "}
          <Link href="/privacy" target="_blank" className={LINK}>
            privacy notice
          </Link>
          .
        </Agree>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="olive" arrow disabled={!ready || pending}>
          {pending ? "Reserving..." : "Reserve and pay"}
        </Button>
      </div>
    </form>
  );
}
