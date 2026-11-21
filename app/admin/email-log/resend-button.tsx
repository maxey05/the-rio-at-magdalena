"use client";

import { useActionState } from "react";
import { Button } from "@/components/button";
import { CheckIcon, InfoIcon } from "@/components/icons";
import { TopLoadingBar } from "@/components/top-loading-bar";
import type { AdminActionState } from "@/lib/admin";
import { resendEmail } from "./actions";

const initialState: AdminActionState = { ok: false, message: null };

export function ResendButton({ emailId }: { emailId: string }) {
  const [state, formAction, pending] = useActionState(resendEmail, initialState);
  const Icon = state.ok ? CheckIcon : InfoIcon;

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <TopLoadingBar active={pending} />
      <input type="hidden" name="emailId" value={emailId} />
      <Button type="submit" variant="secondary" size="small" disabled={pending}>
        {pending ? "Resending..." : "Resend email"}
      </Button>
      <p role="status" className={`flex items-start gap-2 text-small font-medium ${state.ok ? "text-moss-strong" : state.handled ? "text-ink" : "text-danger"}`}>
        {state.message ? (
          <>
            <Icon width={18} height={18} className="mt-0.5 shrink-0" />
            <span>{state.message}</span>
          </>
        ) : null}
      </p>
    </form>
  );
}
