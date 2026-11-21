"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { CheckIcon, ExternalLinkIcon, InfoIcon } from "@/components/icons";
import { InfoCallout } from "@/components/info-callout";
import { StatusBadge } from "@/components/status-badge";
import { TopLoadingBar } from "@/components/top-loading-bar";
import type { AffectedBooking, ClosureState } from "@/lib/calendar";
import { formatDay } from "@/lib/stay";
import { addClosure } from "./actions";

const initialState: ClosureState = {
  ok: false,
  message: null,
  errors: {},
  values: { start: "", end: "", reason: "" },
  affected: [],
  confirmKey: "",
};

function stayText(booking: AffectedBooking): string {
  return booking.kind === "day_tour"
    ? `${formatDay(booking.checkIn)}, day tour`
    : `${formatDay(booking.checkIn)}, check-out ${formatDay(booking.checkOut)}`;
}

export function ClosureForm() {
  const [state, formAction, pending] = useActionState(addClosure, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  const confirming = state.affected.length > 0;

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-4">
      <TopLoadingBar active={pending} />
      {state.ok && state.message ? (
        <p role="status" className="flex items-start gap-3 rounded-input border border-moss bg-moss-soft p-4 text-moss-strong">
          <CheckIcon className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      ) : null}
      {!state.ok && !confirming && state.message ? (
        <p role="alert" className="flex items-start gap-3 rounded-input border border-danger bg-surface p-4 text-danger">
          <InfoIcon className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="closure-start"
          name="start"
          type="date"
          label="Start date"
          defaultValue={state.values.start}
          error={state.errors.start}
        />
        <Field
          id="closure-end"
          name="end"
          type="date"
          label="End date"
          hint="Same as the start date for a single day. The end date is closed too."
          defaultValue={state.values.end}
          error={state.errors.end}
        />
      </div>
      <Field
        id="closure-reason"
        name="reason"
        type="text"
        label="Reason"
        hint="For your records, not shown to guests. Example: High river."
        autoComplete="off"
        defaultValue={state.values.reason}
        error={state.errors.reason}
      />
      {confirming ? (
        <InfoCallout
          title={`${state.affected.length} active ${state.affected.length === 1 ? "booking falls" : "bookings fall"} on these dates`}
        >
          <p role="alert">{state.message}</p>
          <ul className="flex flex-col gap-3">
            {state.affected.map((booking) => (
              <li key={booking.id} className="flex flex-col gap-1 border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link
                    href={`/admin/bookings/${booking.id}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex min-h-11 items-center gap-1 font-bold underline"
                  >
                    {booking.ref}
                    <ExternalLinkIcon width={16} height={16} />
                    <span className="sr-only">(opens in a new tab)</span>
                  </Link>
                  <StatusBadge status={booking.status} />
                </div>
                <p className="text-small">
                  {booking.guestName}, {stayText(booking)}
                </p>
              </li>
            ))}
          </ul>
        </InfoCallout>
      ) : null}
      <input type="hidden" name="confirm" value={state.confirmKey} />
      <Button type="submit" variant={confirming ? "danger" : "primary"} disabled={pending} className="w-full sm:w-auto sm:self-start">
        {pending ? "Saving..." : confirming ? "Close anyway" : "Close these dates"}
      </Button>
    </form>
  );
}
