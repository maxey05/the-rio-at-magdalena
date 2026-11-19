"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/button";
import { InfoIcon } from "@/components/icons";
import { UploadBox } from "@/components/upload-box";
import type { ProofState } from "@/lib/proofs";
import { submitProof } from "./actions";

type ProofFormProps = {
  token: string;
  maxBytes: number;
};

const initialState: ProofState = { errors: {}, message: null, ref: "" };

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-2 text-small text-danger">
      <InfoIcon width={18} height={18} className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}

export function ProofForm({ token, maxBytes }: ProofFormProps) {
  const [state, formAction, pending] = useActionState(submitProof.bind(null, token), initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  const refError = state.errors.ref;
  const proofError = state.errors.proof;

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      {state.message ? (
        <p role="alert" className="flex items-start gap-3 rounded-input border border-danger bg-surface p-4 text-danger">
          <InfoIcon className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor="proof-ref" className="text-small font-medium text-ink">
          GCash reference number
        </label>
        <input
          id="proof-ref"
          name="ref"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={24}
          defaultValue={state.ref}
          aria-invalid={refError ? true : undefined}
          aria-describedby={refError ? "proof-ref-hint proof-ref-error" : "proof-ref-hint"}
          className={`min-h-12 rounded-input border bg-surface px-4 text-body tabular-nums text-ink focus:border-moss ${
            refError ? "border-danger" : "border-line"
          }`}
        />
        <p id="proof-ref-hint" className="text-small text-ink-muted">
          13 digits, printed on your GCash receipt.
        </p>
        {refError ? <FieldError id="proof-ref-error" message={refError} /> : null}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-small font-medium text-ink">Screenshot of your GCash receipt</span>
        <UploadBox
          id="proof-file"
          name="proof"
          maxBytes={maxBytes}
          invalid={Boolean(proofError)}
          describedBy={proofError ? "proof-file-error" : undefined}
        />
        {proofError ? <FieldError id="proof-file-error" message={proofError} /> : null}
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending..." : "Send payment proof"}
      </Button>
    </form>
  );
}
