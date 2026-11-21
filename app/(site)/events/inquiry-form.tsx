"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/button";
import { CheckboxField, Field, SelectField, TextAreaField } from "@/components/field";
import { CheckIcon, InfoIcon } from "@/components/icons";
import { TopLoadingBar } from "@/components/top-loading-bar";
import { eventsContent } from "@/lib/content";
import { INQUIRY_TYPES, type InquiryState } from "@/lib/rules";
import { submitInquiry } from "./actions";

const initialState: InquiryState = {
  ok: false,
  message: null,
  errors: {},
  values: { name: "", mobile: "", email: "", type: "", preferredDate: "", guests: "", message: "", agreePrivacy: false },
};

export function InquiryForm() {
  const [state, formAction, pending] = useActionState(submitInquiry, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const thanksRef = useRef<HTMLParagraphElement>(null);
  const copy = eventsContent.form;

  useEffect(() => {
    if (state.ok) {
      thanksRef.current?.focus();
      return;
    }
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  if (state.ok) {
    return (
      <p
        ref={thanksRef}
        role="status"
        tabIndex={-1}
        className="flex items-start gap-3 rounded-input border border-moss bg-moss-soft p-4 text-moss-strong"
      >
        <CheckIcon className="mt-0.5 shrink-0" />
        {state.message}
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="flex w-full max-w-reading flex-col gap-4">
      <TopLoadingBar active={pending} />
      <p className="text-ink-muted">{copy.intro}</p>
      {state.message ? (
        <p role="alert" className="flex items-start gap-3 rounded-input border border-danger bg-surface p-4 text-danger">
          <InfoIcon className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="inquiry-name"
          name="name"
          type="text"
          label="Your name"
          autoComplete="name"
          defaultValue={state.values.name}
          error={state.errors.name}
        />
        <Field
          id="inquiry-mobile"
          name="mobile"
          type="tel"
          label="Mobile number"
          hint="Example: 0917 123 4567"
          autoComplete="tel"
          defaultValue={state.values.mobile}
          error={state.errors.mobile}
        />
      </div>
      <Field
        id="inquiry-email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        defaultValue={state.values.email}
        error={state.errors.email}
      />
      <SelectField
        id="inquiry-type"
        name="type"
        label="What are you planning?"
        defaultValue={state.values.type}
        error={state.errors.type}
      >
        <option value="">{copy.typePlaceholder}</option>
        {INQUIRY_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </SelectField>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="inquiry-date"
          name="preferredDate"
          type="date"
          label="Preferred date"
          hint={copy.dateHint}
          defaultValue={state.values.preferredDate}
          error={state.errors.preferredDate}
        />
        <Field
          id="inquiry-guests"
          name="guests"
          type="text"
          inputMode="numeric"
          label="Number of guests"
          hint="1 to 300"
          autoComplete="off"
          defaultValue={state.values.guests}
          error={state.errors.guests}
        />
      </div>
      <TextAreaField
        id="inquiry-message"
        name="message"
        label="Your message"
        hint={copy.messageHint}
        rows={6}
        defaultValue={state.values.message}
        error={state.errors.message}
      />
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="inquiry-website">Website</label>
        <input id="inquiry-website" type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <CheckboxField
        id="inquiry-privacy"
        name="agreePrivacy"
        defaultChecked={state.values.agreePrivacy}
        error={state.errors.agreePrivacy}
      >
        {copy.consentLead}{" "}
        <Link href="/privacy" target="_blank" className="font-bold text-moss-strong underline underline-offset-4">
          {copy.consentLink}
        </Link>{" "}
        {copy.consentTail}
      </CheckboxField>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto sm:self-start">
        {pending ? copy.sending : copy.submit}
      </Button>
    </form>
  );
}
