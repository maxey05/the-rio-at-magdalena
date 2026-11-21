"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { CARD, SECTION_TITLE } from "@/components/brand-styles";
import { Button } from "@/components/button";
import { InfoIcon } from "@/components/icons";
import { TopLoadingBar } from "@/components/top-loading-bar";
import type { CancelState } from "@/lib/cancellations";
import { cancelByToken } from "./actions";

type CancelFormProps = {
  token: string;
};

const initialState: CancelState = { message: null };

export function CancelForm({ token }: CancelFormProps) {
  const id = useId();
  const [state, formAction, pending] = useActionState(cancelByToken.bind(null, token), initialState);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    if (state.message) {
      dialogRef.current?.close();
    }
  }, [state]);

  return (
    <div className="flex flex-col gap-4">
      <TopLoadingBar active={pending} />
      {state.message ? (
        <p role="alert" className="flex items-start gap-3 rounded-input border border-danger bg-surface p-4 text-danger">
          <InfoIcon className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      ) : null}
      <div>
        <Button
          ref={startRef}
          type="button"
          variant="ghost-earth"
          aria-haspopup="dialog"
          onClick={() => dialogRef.current?.showModal()}
        >
          Cancel booking
        </Button>
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onCancel={(event) => {
          if (pending) {
            event.preventDefault();
          }
        }}
        onClose={() => startRef.current?.focus()}
        onMouseDown={(event) => {
          pressedBackdrop.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          if (pressedBackdrop.current && event.target === event.currentTarget && !pending) {
            event.currentTarget.close();
          }
        }}
        className={`${CARD} m-auto w-[calc(100%-2rem)] max-w-md p-0 font-brand-body text-[1.125rem] text-earth shadow-float backdrop:bg-shade/45 backdrop:backdrop-blur-sm`}
      >
        <form action={formAction} aria-busy={pending} className="flex flex-col gap-4 p-6">
          <h2 id={`${id}-title`} className={SECTION_TITLE}>
            Cancel this booking?
          </h2>
          <p id={`${id}-description`}>Your slots will be released. This cannot be undone.</p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="olive"
              disabled={pending}
              onClick={() => dialogRef.current?.close()}
              className="sm:flex-1"
            >
              Keep my booking
            </Button>
            <Button type="submit" variant="ghost-danger" disabled={pending} className="sm:flex-1">
              {pending ? "Cancelling..." : "Yes, cancel it"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
