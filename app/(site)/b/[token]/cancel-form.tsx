"use client";

import { useActionState, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/button";
import { InfoIcon } from "@/components/icons";
import type { CancelState } from "@/lib/cancellations";
import { cancelByToken } from "./actions";

type CancelFormProps = {
  token: string;
};

const initialState: CancelState = { message: null };

export function CancelForm({ token }: CancelFormProps) {
  const [state, formAction, pending] = useActionState(cancelByToken.bind(null, token), initialState);
  const [confirming, setConfirming] = useState(false);
  const startRef = useRef<HTMLButtonElement>(null);

  function keepBooking() {
    flushSync(() => setConfirming(false));
    startRef.current?.focus();
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.message ? (
        <p role="alert" className="flex items-start gap-3 rounded-input border border-danger bg-surface p-4 text-danger">
          <InfoIcon className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      ) : null}
      {confirming ? (
        <div role="group" aria-labelledby="cancel-prompt" className="flex flex-col gap-4">
          <p id="cancel-prompt" className="font-bold">
            Cancel this booking? This cannot be undone.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="secondary" autoFocus disabled={pending} onClick={keepBooking}>
              Keep my booking
            </Button>
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Cancelling..." : "Yes, cancel my booking"}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button ref={startRef} type="button" variant="secondary" onClick={() => setConfirming(true)}>
            Cancel booking
          </Button>
        </div>
      )}
    </form>
  );
}
