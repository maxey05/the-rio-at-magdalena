import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Button } from "@/components/button";
import { ChevronDownIcon, InfoIcon, MessageIcon } from "@/components/icons";
import { InfoCallout } from "@/components/info-callout";
import { InquiryStatusBadge } from "@/components/inquiry-status-badge";
import { formatManilaDateTime } from "@/lib/admin";
import { countNew, INQUIRY_LIMIT, listInquiries, mailtoLink, nextStatuses, smsLink } from "@/lib/inquiries";
import { formatDayWithYear } from "@/lib/stay";
import { requireAdmin, type Inquiry, type InquiryStatus } from "@/lib/supabase";
import { NoteForm, StatusControls, type StatusChoice } from "./inquiry-controls";

export const metadata: Metadata = { title: "Inquiries" };

const CHOICE_LABELS: Record<InquiryStatus, string> = { replied: "Mark replied", closed: "Close", new: "Reopen as new" };

function choicesFor(status: InquiryStatus): StatusChoice[] {
  return nextStatuses(status).map((next) => ({
    status: next,
    label: CHOICE_LABELS[next],
    primary: status === "new" && next === "replied",
  }));
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-small font-medium text-ink-muted">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

function InquiryRow({ inquiry }: { inquiry: Inquiry }) {
  return (
    <li>
      <details className="group rounded-card border border-line bg-surface">
        <summary className="flex min-h-11 cursor-pointer list-none flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col gap-1">
            <span className="font-bold">{inquiry.name}</span>
            <span className="text-small text-ink-muted">
              {inquiry.type} · {inquiry.guests} {inquiry.guests === 1 ? "guest" : "guests"} · received{" "}
              {formatManilaDateTime(inquiry.created_at)}
            </span>
          </span>
          <span className="flex items-center gap-3">
            <InquiryStatusBadge status={inquiry.status} />
            <ChevronDownIcon className="shrink-0 transition-transform duration-150 ease-out group-open:rotate-180" />
            <span className="sr-only">Show or hide details</span>
          </span>
        </summary>
        <div className="flex flex-col gap-6 border-t border-line p-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Name">{inquiry.name}</Detail>
            <Detail label="Mobile">
              <span className="tabular-nums">{inquiry.mobile}</span>
            </Detail>
            <Detail label="Email">{inquiry.email}</Detail>
            <Detail label="Type">{inquiry.type}</Detail>
            <Detail label="Preferred date">
              {inquiry.preferred_date ? formatDayWithYear(inquiry.preferred_date) : "Not given"}
            </Detail>
            <Detail label="Guests">{inquiry.guests}</Detail>
            <Detail label="Received">{formatManilaDateTime(inquiry.created_at)}</Detail>
          </dl>
          <div className="flex flex-col gap-1">
            <p className="text-small font-medium text-ink-muted">Message</p>
            <p className="whitespace-pre-wrap break-words">{inquiry.message}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href={mailtoLink(inquiry)} size="small">
              <MessageIcon width={18} height={18} />
              Reply by email
            </Button>
            <Button href={smsLink(inquiry)} variant="secondary" size="small">
              Text
            </Button>
          </div>
          <StatusControls inquiryId={inquiry.id} expected={inquiry.status} choices={choicesFor(inquiry.status)} />
          <NoteForm inquiryId={inquiry.id} note={inquiry.admin_note} />
        </div>
      </details>
    </li>
  );
}

export default async function AdminInquiriesPage() {
  await requireAdmin();
  const { rows, capped } = await listInquiries();
  const waiting = countNew(rows);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1>Inquiries</h1>
        <p className="text-ink-muted">
          Event and prenup inquiries from the website. New first, then Replied, then Closed. Inquiries never block booking dates.
        </p>
      </div>
      <p role="status" className="flex items-center gap-2 text-ink-muted">
        <InfoIcon width={18} height={18} className="shrink-0" />
        {rows.length === 0
          ? "No inquiries yet."
          : `${rows.length} ${rows.length === 1 ? "inquiry" : "inquiries"}, ${waiting} new.`}
      </p>
      {capped ? (
        <InfoCallout title={`Only the newest ${INQUIRY_LIMIT} are shown`}>
          <p>Older inquiries stay in the database but are not listed here.</p>
        </InfoCallout>
      ) : null}
      {rows.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {rows.map((inquiry) => (
            <InquiryRow key={inquiry.id} inquiry={inquiry} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
