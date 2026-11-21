"use client";

import { useActionState } from "react";
import { Button } from "@/components/button";
import { TextAreaField } from "@/components/field";
import { CheckIcon, InfoIcon } from "@/components/icons";
import { TopLoadingBar } from "@/components/top-loading-bar";
import type { AdminActionState } from "@/lib/admin";
import type { InquiryStatus } from "@/lib/supabase";
import { saveNote, setInquiryStatus } from "./actions";

const initialState: AdminActionState = { ok: false, message: null };

export type StatusChoice = { status: InquiryStatus; label: string; primary: boolean };

function Message({ state }: { state: AdminActionState }) {
  if (!state.message) {
    return null;
  }
  const Icon = state.ok ? CheckIcon : InfoIcon;
  return (
    <p role={state.ok ? "status" : "alert"} className={`flex items-start gap-2 text-small font-medium ${state.ok ? "text-moss-strong" : "text-danger"}`}>
      <Icon width={18} height={18} className="mt-0.5 shrink-0" />
      <span>{state.message}</span>
    </p>
  );
}

type StatusControlsProps = {
  inquiryId: string;
  expected: InquiryStatus;
  choices: StatusChoice[];
};

export function StatusControls({ inquiryId, expected, choices }: StatusControlsProps) {
  const [state, formAction, pending] = useActionState(setInquiryStatus, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <TopLoadingBar active={pending} />
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <input type="hidden" name="expected" value={expected} />
      <div className="flex flex-wrap gap-3">
        {choices.map((choice) => (
          <Button
            key={choice.status}
            type="submit"
            name="next"
            value={choice.status}
            variant={choice.primary ? "primary" : "secondary"}
            size="small"
            disabled={pending}
          >
            {choice.label}
          </Button>
        ))}
      </div>
      <Message state={state} />
    </form>
  );
}

export function NoteForm({ inquiryId, note }: { inquiryId: string; note: string }) {
  const [state, formAction, pending] = useActionState(saveNote, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <TopLoadingBar active={pending} />
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <TextAreaField
        id={`note-${inquiryId}`}
        name="note"
        label="Internal note"
        hint="Only admins see this."
        rows={3}
        defaultValue={note}
        error={state.errors?.note}
      />
      <Button type="submit" variant="secondary" size="small" disabled={pending} className="self-start">
        {pending ? "Saving..." : "Save note"}
      </Button>
      <Message state={state} />
    </form>
  );
}
