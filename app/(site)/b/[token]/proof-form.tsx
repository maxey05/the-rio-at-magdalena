"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { CARD } from "@/components/brand-styles";
import { Button } from "@/components/button";
import { DownloadIcon, InfoIcon } from "@/components/icons";
import { StepTitle } from "@/components/step-title";
import { TopLoadingBar } from "@/components/top-loading-bar";
import { UploadBox } from "@/components/upload-box";
import type { ProofState } from "@/lib/proofs";
import { submitProof } from "./actions";

type ProofFormProps = {
  token: string;
  proofMaxBytes: number;
  contractMaxBytes: number;
  totalMaxBytes: number;
};

const initialState: ProofState = { errors: {}, message: null };

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const CONTRACT_TYPES = ["application/pdf", ...IMAGE_TYPES] as const;

const TOTAL_ERROR = "Your two files are over 5.5 MB together. Choose smaller files.";

function megabytes(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-2 text-base text-danger">
      <InfoIcon width={18} height={18} className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}

export function ProofForm({ token, proofMaxBytes, contractMaxBytes, totalMaxBytes }: ProofFormProps) {
  const [state, formAction, pending] = useActionState(submitProof.bind(null, token), initialState);
  const [seenState, setSeenState] = useState(state);
  const [attempt, setAttempt] = useState(0);
  const [totalError, setTotalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (seenState !== state) {
    setSeenState(state);
    setAttempt((value) => value + 1);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const form = formRef.current;
    const proof = form?.querySelector<HTMLInputElement>('input[name="proof"]')?.files?.[0];
    const contract = form?.querySelector<HTMLInputElement>('input[name="contract"]')?.files?.[0];
    if (proof && contract && proof.size + contract.size > totalMaxBytes) {
      event.preventDefault();
      setTotalError(TOTAL_ERROR);
      return;
    }
    setTotalError(null);
  }

  const proofError = state.errors.proof;
  const contractError = state.errors.contract;
  const formError = totalError ?? state.message;

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex min-w-0 flex-[1_1_26rem] flex-col gap-4">
      <TopLoadingBar active={pending} />
      {formError ? (
        <p role="alert" className="flex items-start gap-3 rounded-xs border border-danger bg-paper px-4 py-3 text-danger">
          <InfoIcon className="mt-0.5 shrink-0" />
          {formError}
        </p>
      ) : null}

      <section aria-labelledby="receipt-title" className={`${CARD} flex flex-col gap-3 px-5 py-4.5`}>
        <StepTitle id="receipt-title" number={2}>
          Upload your receipt
        </StepTitle>
        <p className="text-earth-muted">Upload a screenshot of your GCash receipt.</p>
        <UploadBox
          key={`proof-${attempt}`}
          id="proof-file"
          name="proof"
          accept={IMAGE_TYPES}
          maxBytes={proofMaxBytes}
          title="Upload GCash screenshot"
          hint={`JPG, PNG or WebP, up to ${megabytes(proofMaxBytes)} MB`}
          typeError="Upload a JPG, PNG or WebP image."
          sizeError={`That image is over ${megabytes(proofMaxBytes)} MB. Choose a smaller screenshot.`}
          previewAlt="Preview of your GCash screenshot"
          invalid={Boolean(proofError)}
          describedBy={proofError ? "proof-file-error" : undefined}
        />
        {proofError ? <FieldError id="proof-file-error" message={proofError} /> : null}
      </section>

      <section aria-labelledby="contract-title" className={`${CARD} flex flex-col gap-3 px-5 py-4.5`}>
        <StepTitle id="contract-title" number={3}>
          Sign the camping agreement
        </StepTitle>
        <p className="text-earth-muted">We require a signed copy of this contract. Please upload it below.</p>
        <div>
          <Button href="/contract/camping-agreement.pdf" variant="ghost-earth" size="small" target="_blank" rel="noopener noreferrer">
            <DownloadIcon width={16} height={16} />
            Download contract (PDF)
          </Button>
        </div>
        <UploadBox
          key={`contract-${attempt}`}
          id="contract-file"
          name="contract"
          accept={CONTRACT_TYPES}
          maxBytes={contractMaxBytes}
          title="Upload signed contract"
          hint={`PDF, JPG, PNG or WebP, up to ${megabytes(contractMaxBytes)} MB`}
          typeError="Upload a PDF, JPG, PNG or WebP file."
          sizeError={`That file is over ${megabytes(contractMaxBytes)} MB. Choose a smaller file.`}
          previewAlt="Preview of your signed contract"
          invalid={Boolean(contractError)}
          describedBy={contractError ? "contract-file-error" : undefined}
        />
        {contractError ? <FieldError id="contract-file-error" message={contractError} /> : null}
      </section>

      <div className="flex flex-col gap-2">
        <Button type="submit" variant="olive" arrow disabled={pending} className="min-h-13! w-full">
          {pending ? "Sending..." : "Send for checking"}
        </Button>
        <p className="text-left text-base text-earth-muted">
          Once we check your payment, a confirmation email will be sent for your booking.
        </p>
      </div>
    </form>
  );
}
