import type { Metadata } from "next";
import Link from "next/link";
import { InfoCallout } from "@/components/info-callout";
import { EMAIL_KIND_LABELS, EMAIL_LOG_LIMIT, formatManilaDateTime, listEmailLog } from "@/lib/admin";
import { requireAdmin } from "@/lib/supabase";
import { emailErrorText, EmailStatus } from "./email-status";
import { ResendButton } from "./resend-button";

export const metadata: Metadata = { title: "Email log" };

type EmailLogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const filterStyles = "inline-flex min-h-11 items-center rounded-full px-4 text-small font-bold transition-colors duration-150 ease-out";

export default async function EmailLogPage({ searchParams }: EmailLogPageProps) {
  await requireAdmin();
  const { failed } = await searchParams;
  const failedOnly = (Array.isArray(failed) ? failed[0] : failed) === "1";
  const { rows, capped } = await listEmailLog(failedOnly);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1>Email log</h1>
        <p className="text-ink-muted">Every email the site tried to send, newest first. A failed email never undoes a decision.</p>
      </div>

      <nav aria-label="Email filter">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/admin/email-log"
              aria-current={failedOnly ? undefined : "page"}
              className={`${filterStyles} ${failedOnly ? "border border-line bg-surface text-ink hover:bg-moss-soft" : "bg-moss-strong text-surface"}`}
            >
              All emails
            </Link>
          </li>
          <li>
            <Link
              href="/admin/email-log?failed=1"
              aria-current={failedOnly ? "page" : undefined}
              className={`${filterStyles} ${failedOnly ? "bg-moss-strong text-surface" : "border border-line bg-surface text-ink hover:bg-moss-soft"}`}
            >
              Failed only
            </Link>
          </li>
        </ul>
      </nav>

      {capped ? (
        <InfoCallout title={`Only the newest ${EMAIL_LOG_LIMIT} are shown`}>
          <p>Older emails are still saved in the database.</p>
        </InfoCallout>
      ) : null}

      {rows.length === 0 ? (
        <p role="status" className="text-ink-muted">
          {failedOnly ? "No failed emails." : "No emails have been sent yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const error = emailErrorText(row.error);
            return (
              <li key={row.id} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">{EMAIL_KIND_LABELS[row.kind] ?? row.kind}</span>
                  <EmailStatus status={row.status} />
                </div>
                <div className="flex flex-col gap-1">
                  <p>{row.subject}</p>
                  <p className="text-small text-ink-muted">
                    {formatManilaDateTime(row.created_at)} (Manila time) · To {row.recipient}
                  </p>
                  {row.booking_id ? (
                    <p className="text-small">
                      <Link href={`/admin/bookings/${row.booking_id}`} className="font-bold text-moss-strong underline">
                        Open booking
                      </Link>
                    </p>
                  ) : null}
                  {error ? <p className="text-small font-medium text-danger">{error}</p> : null}
                </div>
                <details>
                  <summary className="flex min-h-11 cursor-pointer items-center font-bold text-moss-strong">View body</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded-input bg-bg p-4 font-sans text-small">{row.body}</pre>
                </details>
                {row.resendable ? <ResendButton emailId={row.id} /> : null}
                {row.status === "failed" && !row.resendable ? (
                  <p className="text-small text-ink-muted">Already resent. See the newer copy above.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
