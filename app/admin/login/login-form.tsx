"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { TopLoadingBar } from "@/components/top-loading-bar";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      <TopLoadingBar active={pending} />
      <Field
        id="login-email"
        name="email"
        type="email"
        label="Email"
        autoComplete="username"
        required
        defaultValue={state.email}
      />
      <Field
        id="login-password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        error={state.error ?? undefined}
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
