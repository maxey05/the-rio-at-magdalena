"use client";

import { startTransition, useActionState, useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/button";
import { CheckboxField, Field, TextAreaField } from "@/components/field";
import { InfoIcon } from "@/components/icons";
import type { AdminActionState } from "@/lib/admin";

export type DialogField =
  | { kind: "text" | "number"; name: string; label: string; hint?: string; defaultValue?: string; placeholder?: string }
  | { kind: "checkbox"; name: string; label: string; defaultChecked?: boolean };

type ConfirmDialogProps = {
  trigger: string;
  triggerVariant?: "primary" | "secondary" | "danger";
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  danger?: boolean;
  reasonLabel?: string;
  reasonHint?: string;
  fields?: DialogField[];
  hidden?: Record<string, string>;
  action: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  onResult?: (state: AdminActionState) => void;
};

const initialState: AdminActionState = { ok: false, message: null };

const dangerSubmitStyles =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-danger px-6 font-bold text-surface transition-colors duration-150 ease-out hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50";

export function ConfirmDialog({
  trigger,
  triggerVariant = "primary",
  title,
  description,
  confirmLabel,
  pendingLabel = "Saving...",
  danger = false,
  reasonLabel,
  reasonHint,
  fields = [],
  hidden = {},
  action,
  onResult,
}: ConfirmDialogProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pressedBackdrop = useRef(false);
  const [state, formAction, pending] = useActionState(
    async (previous: AdminActionState, formData: FormData) => {
      const next = await action(previous, formData);
      if (next.ok) {
        formRef.current?.reset();
        dialogRef.current?.close();
      }
      onResult?.(next);
      return next;
    },
    initialState,
  );

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  const errors = state.errors ?? {};
  const submitLabel = pending ? pendingLabel : confirmLabel;

  return (
    <>
      <Button
        variant={triggerVariant}
        size="small"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        {trigger}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-description` : undefined}
        onCancel={(event) => {
          if (pending) {
            event.preventDefault();
          }
        }}
        onMouseDown={(event) => {
          pressedBackdrop.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          if (pressedBackdrop.current && event.target === event.currentTarget && !pending) {
            event.currentTarget.close();
          }
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-line bg-surface p-0 text-ink backdrop:bg-ink/60"
      >
        <form ref={formRef} onSubmit={submit} noValidate aria-busy={pending} className="flex flex-col gap-4 p-5 md:p-6">
          <h2 id={`${id}-title`} className="font-sans text-h3 font-bold">
            {title}
          </h2>
          {description ? (
            <div id={`${id}-description`} className="text-ink-muted">
              {description}
            </div>
          ) : null}
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {reasonLabel ? (
            <TextAreaField
              id={`${id}-reason`}
              name="reason"
              label={reasonLabel}
              hint={reasonHint}
              error={errors.reason}
            />
          ) : null}
          {fields.map((field) =>
            field.kind === "checkbox" ? (
              <CheckboxField
                key={field.name}
                id={`${id}-${field.name}`}
                name={field.name}
                defaultChecked={field.defaultChecked}
              >
                {field.label}
              </CheckboxField>
            ) : (
              <Field
                key={field.name}
                id={`${id}-${field.name}`}
                name={field.name}
                label={field.label}
                hint={field.hint}
                type={field.kind}
                inputMode={field.kind === "number" ? "numeric" : undefined}
                min={field.kind === "number" ? 0 : undefined}
                step={field.kind === "number" ? 1 : undefined}
                placeholder={field.placeholder}
                defaultValue={field.defaultValue}
                error={errors[field.name]}
              />
            ),
          )}
          {state.message && !state.ok ? (
            <p role="alert" className="flex items-start gap-2 font-medium text-danger">
              <InfoIcon className="mt-0.5 shrink-0" />
              <span>{state.message}</span>
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" disabled={pending} onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            {danger ? (
              <button type="submit" disabled={pending} className={dangerSubmitStyles}>
                {submitLabel}
              </button>
            ) : (
              <Button type="submit" disabled={pending}>
                {submitLabel}
              </Button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
