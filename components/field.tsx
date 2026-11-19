import type { ComponentProps, ReactNode } from "react";
import { InfoIcon } from "@/components/icons";

const controlStyles =
  "w-full rounded-input border bg-surface px-4 text-body text-ink placeholder:text-ink-muted focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss";

type FieldShellProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
};

function FieldShell({ id, label, error, hint, children }: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-small font-medium">
        {label}
      </label>
      {children(describedBy, Boolean(error))}
      {hint ? (
        <p id={hintId} className="text-small text-ink-muted">
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} error={error} />
    </div>
  );
}

export function FieldError({ id, error }: { id?: string; error?: string }) {
  if (!error) {
    return null;
  }
  return (
    <p id={id} role="alert" className="flex items-start gap-2 text-small font-medium text-danger">
      <InfoIcon width={18} height={18} className="mt-0.5 shrink-0" />
      <span>{error}</span>
    </p>
  );
}

type FieldProps = Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function Field({ id, label, error, hint, className, ...props }: FieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      {(describedBy, invalid) => (
        <input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...props}
          className={`${controlStyles} min-h-12 ${invalid ? "border-danger" : "border-line"} ${className ?? ""}`}
        />
      )}
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function TextAreaField({ id, label, error, hint, className, ...props }: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      {(describedBy, invalid) => (
        <textarea
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...props}
          className={`${controlStyles} min-h-28 py-3 ${invalid ? "border-danger" : "border-line"} ${className ?? ""}`}
        />
      )}
    </FieldShell>
  );
}

type CheckboxFieldProps = Omit<ComponentProps<"input">, "id" | "type"> & {
  id: string;
  error?: string;
  children: ReactNode;
};

export function CheckboxField({ id, error, children, ...props }: CheckboxFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          {...props}
          className="mt-0.5 size-6 shrink-0 accent-moss-strong"
        />
        <span>{children}</span>
      </label>
      <FieldError id={errorId} error={error} />
    </div>
  );
}
