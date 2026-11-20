"use server";

import { eventsContent } from "@/lib/content";
import { sendAdminInquiry } from "@/lib/email";
import { countInquiriesFromEmail, insertInquiry } from "@/lib/inquiries";
import {
  INQUIRY_DAILY_LIMIT,
  manilaToday,
  validateInquiry,
  type InquiryFormValues,
  type InquiryState,
} from "@/lib/rules";

const MAX_FIELD_LENGTH = 2000;

const BLANK: InquiryFormValues = {
  name: "",
  mobile: "",
  email: "",
  type: "",
  preferredDate: "",
  guests: "",
  message: "",
  agreePrivacy: false,
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.slice(0, MAX_FIELD_LENGTH) : "";
}

function readValues(formData: FormData): InquiryFormValues {
  return {
    name: text(formData, "name"),
    mobile: text(formData, "mobile"),
    email: text(formData, "email"),
    type: text(formData, "type"),
    preferredDate: text(formData, "preferredDate"),
    guests: text(formData, "guests"),
    message: text(formData, "message"),
    agreePrivacy: formData.get("agreePrivacy") === "on",
  };
}

function state(overrides: Partial<InquiryState>): InquiryState {
  return { ok: false, message: null, errors: {}, values: BLANK, ...overrides };
}

export async function submitInquiry(_previous: InquiryState, formData: FormData): Promise<InquiryState> {
  const values = readValues(formData);
  const today = manilaToday();
  const checked = validateInquiry({ ...values, website: text(formData, "website") }, today);
  if (!checked.ok) {
    return checked.spam ? state({ ok: true, message: eventsContent.form.thankYou }) : state({ values, errors: checked.errors });
  }

  let inquiryId: string;
  try {
    if ((await countInquiriesFromEmail(checked.values.email, today)) >= INQUIRY_DAILY_LIMIT) {
      return state({ values, message: eventsContent.form.limitReached });
    }
    inquiryId = await insertInquiry(checked.values);
  } catch (error) {
    console.error("submit inquiry failed", error instanceof Error ? error.message : error);
    return state({ values, message: eventsContent.form.failed });
  }

  await sendAdminInquiry({ id: inquiryId, ...checked.values });
  return state({ ok: true, message: eventsContent.form.thankYou });
}
